from datetime import datetime, timezone
import logging
from sqlalchemy.orm import Session
from backend.app.models.models import Document, ExtractedEntity

logger = logging.getLogger(__name__)

class TemporalService:
    @staticmethod
    def resolve_active_versions(db: Session):
        """
        Scan all documents in the system and determine which ones are active based on:
        1. Version number (highest version of identical SOPs/procedures is active).
        2. Date validity (valid_from <= current_time <= valid_until).
        """
        try:
            logger.info("Resolving document active statuses and version hierarchy...")
            
            # Find all unique SOP names in the system
            sops_entities = db.query(ExtractedEntity).filter(
                ExtractedEntity.entity_type == "SOP"
            ).all()
            
            sop_values = list(set([e.entity_value for e in sops_entities]))
            
            # Reset all documents referencing SOPs to active first
            # to re-evaluate them
            all_sop_doc_ids = [e.document_id for e in sops_entities]
            db.query(Document).filter(Document.id.in_(all_sop_doc_ids)).update({"is_active": True}, synchronize_session=False)
            db.commit()

            current_time = datetime.now()

            # For each unique SOP, find all referencing documents and sort by version
            for sop in sop_values:
                docs = db.query(Document).join(ExtractedEntity).filter(
                    ExtractedEntity.entity_type == "SOP",
                    ExtractedEntity.entity_value == sop,
                    Document.filename.like("%SOP%")
                ).all()

                if not docs:
                    continue

                # Sort by version descending, then upload date descending
                docs.sort(key=lambda x: (x.version, x.uploaded_at), reverse=True)

                # The first one is the candidate for "latest valid"
                latest_doc = docs[0]

                # Deactivate older versions
                for doc in docs[1:]:
                    doc.is_active = False
                    logger.info(f"Deactivating superseded SOP version: {doc.filename} (v{doc.version}) is superseded by {latest_doc.filename} (v{latest_doc.version})")

            # Now, enforce date validity across all documents
            all_docs = db.query(Document).all()
            for doc in all_docs:
                # If valid_until has passed, deactivate
                if doc.valid_until and doc.valid_until < current_time:
                    doc.is_active = False
                    logger.info(f"Deactivating expired document: {doc.filename} (Expired on {doc.valid_until.strftime('%Y-%m-%d')})")
                
                # If valid_from is in the future, deactivate (not yet active)
                if doc.valid_from and doc.valid_from > current_time:
                    doc.is_active = False
                    logger.info(f"Deactivating pre-active document: {doc.filename} (Starts on {doc.valid_from.strftime('%Y-%m-%d')})")

            db.commit()
            logger.info("Version and temporal status resolution complete.")
        except Exception as e:
            logger.error(f"Error resolving active versions: {e}")
            db.rollback()

    @staticmethod
    def get_document_history_chain(db: Session, doc_id: int) -> list:
        """
        Given a document ID, find its entire historical version chain (predecessors and successors).
        """
        # Find if this document has an SOP entity
        sop_entity = db.query(ExtractedEntity).filter(
            ExtractedEntity.document_id == doc_id,
            ExtractedEntity.entity_type == "SOP"
        ).first()

        if not sop_entity:
            # Fallback: search by name
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if not doc:
                return []
            return [doc]

        # Find all documents referencing the same SOP
        docs = db.query(Document).join(ExtractedEntity).filter(
            ExtractedEntity.entity_type == "SOP",
            ExtractedEntity.entity_value == sop_entity.entity_value
        ).all()

        # Sort by version ascending (oldest first)
        docs.sort(key=lambda x: x.version)
        return docs
