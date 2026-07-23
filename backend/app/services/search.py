import os
import pickle
import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.models import Document, ExtractedEntity
from backend.app.services.graph import GraphService

logger = logging.getLogger(__name__)

# Try importing sentence_transformers
try:
    from sentence_transformers import SentenceTransformer
    transformers_available = True
except ImportError:
    transformers_available = False
    logger.warning("sentence-transformers is not available yet. Using simple TF-IDF keyword search fallback.")

class LocalVectorStore:
    def __init__(self):
        self.index_file = os.path.join(settings.VECTOR_DB_DIR, "vector_store.pkl")
        self.model_name = "all-MiniLM-L6-v2"
        self._model = None
        self.chunks = []       # List of Dict: {doc_id, text, chunk_index}
        self.embeddings = []   # List of np.ndarray
        self.load()

    @property
    def model(self):
        if self._model is None and transformers_available:
            logger.info(f"Loading SentenceTransformer model '{self.model_name}'...")
            try:
                self._model = SentenceTransformer(self.model_name)
            except Exception as e:
                logger.error(f"Failed to load SentenceTransformer: {e}")
        return self._model

    def save(self):
        try:
            with open(self.index_file, "wb") as f:
                pickle.dump({
                    "chunks": self.chunks,
                    "embeddings": self.embeddings
                }, f)
            logger.info(f"Saved vector index with {len(self.chunks)} chunks.")
        except Exception as e:
            logger.error(f"Failed to save vector store: {e}")

    def load(self):
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "rb") as f:
                    data = pickle.load(f)
                    self.chunks = data.get("chunks", [])
                    self.embeddings = data.get("embeddings", [])
                logger.info(f"Loaded vector store with {len(self.chunks)} chunks.")
            except Exception as e:
                logger.error(f"Failed to load vector store: {e}")

    def add_document(self, doc_id: int, text: str):
        if not text:
            return
        
        # Simple paragraph chunker
        paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 10]
        if not paragraphs:
            # Fallback to character chunking
            chunk_size = 500
            paragraphs = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size - 100)]

        new_chunks = []
        for idx, para in enumerate(paragraphs):
            new_chunks.append({
                "doc_id": doc_id,
                "text": para,
                "chunk_index": idx
            })

        # Remove existing chunks for this document to support re-indexing
        indices_to_keep = [i for i, chunk in enumerate(self.chunks) if chunk["doc_id"] != doc_id]
        self.chunks = [self.chunks[i] for i in indices_to_keep]
        self.embeddings = [self.embeddings[i] for i in indices_to_keep]

        # Generate embeddings
        if self.model and new_chunks:
            texts = [c["text"] for c in new_chunks]
            embs = self.model.encode(texts)
            self.chunks.extend(new_chunks)
            self.embeddings.extend([emb for emb in embs])
            self.save()
        else:
            # Fallback when model is not loaded
            self.chunks.extend(new_chunks)
            # Create zero-vectors just to keep sizes aligned
            self.embeddings.extend([np.zeros(384) for _ in new_chunks])
            self.save()

    def search(self, query: str, top_k: int = 5) -> List[Tuple[Dict[str, Any], float]]:
        if not self.chunks:
            return []

        # Generate query embedding
        if self.model:
            query_emb = self.model.encode(query)
            
            # Compute cosine similarity
            similarities = []
            for emb in self.embeddings:
                if np.linalg.norm(emb) == 0 or np.linalg.norm(query_emb) == 0:
                    sim = 0.0
                else:
                    sim = np.dot(emb, query_emb) / (np.linalg.norm(emb) * np.linalg.norm(query_emb))
                similarities.append(float(sim))
        else:
            # Fallback to simple keyword match score if model is not available
            similarities = []
            query_words = set(query.lower().split())
            for chunk in self.chunks:
                chunk_words = set(chunk["text"].lower().split())
                overlap = query_words.intersection(chunk_words)
                sim = len(overlap) / max(len(query_words), 1)
                similarities.append(sim)

        # Sort and return top_k
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = []
        for idx in top_indices:
            results.append((self.chunks[idx], similarities[idx]))
        return results


# Global vector store instance
vector_store = LocalVectorStore()


class SearchService:
    @staticmethod
    def index_document(doc_id: int, text: str):
        vector_store.add_document(doc_id, text)

    @staticmethod
    def hybrid_search(db: Session, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # 1. Semantic search
        vector_results = vector_store.search(query, top_k=top_k * 2)

        # 2. Extract potential entities from query to run Graph boosting
        # E.g. Find matching equipment names or regulation names in query
        query_upper = query.upper()
        equipments_in_db = db.query(ExtractedEntity).filter(ExtractedEntity.entity_type == "EQUIPMENT").all()
        equip_names = set([e.entity_value for e in equipments_in_db])
        
        target_entities = []
        for equip in equip_names:
            if equip in query_upper:
                target_entities.append(equip)

        # Regulations
        regs_in_db = db.query(ExtractedEntity).filter(ExtractedEntity.entity_type == "REGULATION").all()
        reg_names = set([r.entity_value for r in regs_in_db])
        for reg in reg_names:
            if reg in query_upper:
                target_entities.append(reg)

        # Find documents linked to these target entities in graph
        boosted_doc_ids = set()
        for ent_name in target_entities:
            related = GraphService.get_related_nodes(db, ent_name, depth=1)
            for node in related:
                if node["node_type"] == "Document":
                    doc_id = node["properties"].get("doc_id")
                    if doc_id:
                        boosted_doc_ids.add(doc_id)

        # 3. Combine scores and aggregate by document or keep chunk granularity
        scored_chunks = []
        for chunk, semantic_score in vector_results:
            doc_id = chunk["doc_id"]
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                continue

            # Standard score is semantic score
            final_score = semantic_score

            # Boost if document is linked to queried entities in graph
            if doc_id in boosted_doc_ids:
                final_score += 0.25  # Graph boost weight

            # Boost if document is the latest version / active
            if doc.is_active:
                final_score += 0.15

            # Deduct if document is superseded / inactive
            if not doc.is_active:
                final_score -= 0.20

            scored_chunks.append({
                "document_id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "text": chunk["text"],
                "chunk_index": chunk["chunk_index"],
                "score": round(max(0.0, min(1.0, final_score)), 3),
                "is_active": doc.is_active,
                "version": doc.version
            })

        # Sort by final score desc
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]
