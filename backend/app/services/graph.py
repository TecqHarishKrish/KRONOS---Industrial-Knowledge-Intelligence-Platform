import json
import logging
import networkx as nx
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import GraphNode, GraphEdge, Document, ExtractedEntity

logger = logging.getLogger(__name__)

class GraphService:
    _graph_instance: nx.DiGraph = None

    @classmethod
    def get_graph(cls, db: Session) -> nx.DiGraph:
        if cls._graph_instance is None:
            cls._graph_instance = nx.DiGraph()
            cls._load_graph_from_db(db)
        return cls._graph_instance

    @classmethod
    def _load_graph_from_db(cls, db: Session):
        try:
            logger.info("Initializing NetworkX graph from database...")
            nodes = db.query(GraphNode).all()
            for node in nodes:
                properties = json.loads(node.properties_json or "{}")
                cls._graph_instance.add_node(
                    node.id,
                    name=node.name,
                    node_type=node.node_type,
                    **properties
                )
            
            edges = db.query(GraphEdge).all()
            for edge in edges:
                properties = json.loads(edge.properties_json or "{}")
                cls._graph_instance.add_edge(
                    edge.source_node_id,
                    edge.target_node_id,
                    relation_type=edge.relation_type,
                    **properties
                )
            logger.info(f"Loaded {len(nodes)} nodes and {len(edges)} edges into NetworkX.")
        except Exception as e:
            logger.error(f"Failed to load graph from database: {e}")

    @classmethod
    def add_node(cls, db: Session, name: str, node_type: str, properties: Dict[str, Any] = None) -> int:
        g = cls.get_graph(db)
        
        # Check if node already exists (by name and type)
        # Search in db to get the ID
        existing = db.query(GraphNode).filter(
            GraphNode.name == name,
            GraphNode.node_type == node_type
        ).first()

        if existing:
            # Update in memory in case it's missing
            props = json.loads(existing.properties_json or "{}")
            if properties:
                props.update(properties)
                existing.properties_json = json.dumps(props)
                db.commit()
            g.add_node(existing.id, name=name, node_type=node_type, **props)
            return existing.id

        # Create new node
        props_str = json.dumps(properties or {})
        db_node = GraphNode(name=name, node_type=node_type, properties_json=props_str)
        db.add(db_node)
        db.commit()
        db.refresh(db_node)

        # Add to NetworkX
        g.add_node(db_node.id, name=name, node_type=node_type, **(properties or {}))
        return db_node.id

    @classmethod
    def add_edge(cls, db: Session, source_id: int, target_id: int, relation_type: str, properties: Dict[str, Any] = None):
        g = cls.get_graph(db)

        # Check if edge already exists in DB
        existing = db.query(GraphEdge).filter(
            GraphEdge.source_node_id == source_id,
            GraphEdge.target_node_id == target_id,
            GraphEdge.relation_type == relation_type
        ).first()

        if existing:
            return

        # Add to DB
        db_edge = GraphEdge(
            source_node_id=source_id,
            target_node_id=target_id,
            relation_type=relation_type,
            properties_json=json.dumps(properties or {})
        )
        db.add(db_edge)
        db.commit()

        # Add to NetworkX
        g.add_edge(source_id, target_id, relation_type=relation_type, **(properties or {}))

    @classmethod
    def add_document_to_graph(cls, db: Session, doc: Document, entities: List[ExtractedEntity]):
        # 1. Create node for the document
        doc_node_id = cls.add_node(
            db,
            name=doc.filename,
            node_type="Document",
            properties={
                "doc_id": doc.id,
                "file_type": doc.file_type,
                "version": doc.version,
                "valid_from": doc.valid_from.isoformat() if doc.valid_from else None,
                "valid_until": doc.valid_until.isoformat() if doc.valid_until else None,
                "is_active": doc.is_active
            }
        )

        # 2. Add node for entities and draw edges
        for ent in entities:
            # Map DB type to Graph node type
            # DB entity types: EQUIPMENT, INCIDENT, SOP, REGULATION, DATE, PERSON, LOCATION
            # Graph node types: Document, Equipment, Incident, SOP, Regulation, Date, Person
            node_type = ent.entity_type.title()
            
            ent_node_id = cls.add_node(db, name=ent.entity_value, node_type=node_type)

            # Determine relation type
            relation = "RELATED_TO"
            if ent.entity_type in ["SOP", "REGULATION"]:
                relation = "REFERENCES"
            
            cls.add_edge(db, doc_node_id, ent_node_id, relation)

            # Draw extra links (e.g. Equipment linked to Incident)
            if ent.entity_type == "EQUIPMENT":
                # If there is also an incident in the document, link Equipment to Incident
                incidents = [e for e in entities if e.entity_type == "INCIDENT"]
                for inc in incidents:
                    inc_node_id = cls.add_node(db, name=inc.entity_value, node_type="Incident")
                    # Equipment -> RELATED_TO -> Incident
                    cls.add_edge(db, ent_node_id, inc_node_id, "RELATED_TO")

        # 3. Handle version chains (SUPERSEDES relation)
        # Find other documents in the graph that share the same Equipment or SOP, but have a different version
        sops = [e for e in entities if e.entity_type == "SOP"]
        equipments = [e for e in entities if e.entity_type == "EQUIPMENT"]
        
        if sops:
            for sop_ent in sops:
                # Find other active documents referencing the same SOP
                other_docs = db.query(Document).join(ExtractedEntity).filter(
                    ExtractedEntity.entity_type == "SOP",
                    ExtractedEntity.entity_value == sop_ent.entity_value,
                    Document.id != doc.id
                ).all()

                for other in other_docs:
                    other_node_id = cls.add_node(db, name=other.filename, node_type="Document")
                    if doc.version > other.version:
                        cls.add_edge(db, doc_node_id, other_node_id, "SUPERSEDES")
                        cls.add_edge(db, other_node_id, doc_node_id, "REPLACED_BY")
                    elif doc.version < other.version:
                        cls.add_edge(db, other_node_id, doc_node_id, "SUPERSEDES")
                        cls.add_edge(db, doc_node_id, other_node_id, "REPLACED_BY")

    @classmethod
    def query_graph_data(cls, db: Session) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch all nodes and edges formatted for ECharts graph visualization."""
        # Force reload to match DB
        cls._graph_instance = nx.DiGraph()
        cls._load_graph_from_db(db)
        
        nodes_list = []
        for node_id, data in cls._graph_instance.nodes(data=True):
            nodes_list.append({
                "id": node_id,
                "name": data.get("name", f"Node-{node_id}"),
                "node_type": data.get("node_type", "Unknown"),
                "properties": {k: v for k, v in data.items() if k not in ["name", "node_type"]}
            })
            
        edges_list = []
        for source, target, data in cls._graph_instance.edges(data=True):
            edges_list.append({
                "id": hash(f"{source}-{target}-{data.get('relation_type')}"),
                "source_node_id": source,
                "target_node_id": target,
                "relation_type": data.get("relation_type", "RELATED_TO"),
                "properties": {k: v for k, v in data.items() if k != "relation_type"}
            })

        return {"nodes": nodes_list, "edges": edges_list}

    @classmethod
    def get_related_nodes(cls, db: Session, entity_name: str, depth: int = 1) -> List[Dict[str, Any]]:
        """Return list of nodes connected to the entity name."""
        g = cls.get_graph(db)
        
        # Find the node ID of the entity
        target_node_id = None
        for n_id, data in g.nodes(data=True):
            if data.get("name", "").lower() == entity_name.lower():
                target_node_id = n_id
                break
                
        if target_node_id is None:
            return []

        # Find connected nodes
        connected = set([target_node_id])
        current_layer = set([target_node_id])
        for _ in range(depth):
            next_layer = set()
            for node in current_layer:
                # Add neighbors
                for neighbor in g.neighbors(node):
                    next_layer.add(neighbor)
                # Add predecessors (since it's a directed graph)
                for pred in g.predecessors(node):
                    next_layer.add(pred)
            connected.update(next_layer)
            current_layer = next_layer

        result = []
        for n_id in connected:
            data = g.nodes[n_id]
            result.append({
                "id": n_id,
                "name": data.get("name"),
                "node_type": data.get("node_type"),
                "properties": {k: v for k, v in data.items() if k not in ["name", "node_type"]}
            })
        return result
