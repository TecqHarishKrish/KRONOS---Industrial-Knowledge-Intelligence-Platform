import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.core.database import SessionLocal
from backend.app.core.security import verify_password
from backend.app.models.models import User, Document, ExtractedEntity, ConflictRecord, GraphNode, GraphEdge
from backend.app.services.search import SearchService
from backend.app.services.graph import GraphService

def verify_system_state():
    print("================ KRONOS SYSTEM VERIFICATION ================")
    db = SessionLocal()
    try:
        # 1. Verify Users
        print("\n[1/5] Verifying Seeded Users...")
        users = db.query(User).all()
        print(f"Total Users: {len(users)}")
        for u in users:
            is_valid = verify_password(f"{u.username}123", u.password_hash)
            print(f" - User '{u.username}' (Role: {u.role}) - Password Check: {'PASS' if is_valid else 'FAIL'}")
            assert is_valid, f"Password check failed for user {u.username}"
            
        # 2. Verify Documents & Ingestion
        print("\n[2/5] Verifying Ingested Documents...")
        docs = db.query(Document).all()
        print(f"Total Documents: {len(docs)}")
        for d in docs:
            print(f" - Doc '{d.filename}' (v{d.version}) - Status: {d.status} - Active: {d.is_active}")
            assert d.status == "completed", f"Document {d.filename} processing failed"

        # 3. Verify Entity Extraction
        print("\n[3/5] Verifying Extracted Entities...")
        entities = db.query(ExtractedEntity).all()
        print(f"Total Extracted Entities: {len(entities)}")
        eqs = [e.entity_value for e in entities if e.entity_type == "EQUIPMENT"]
        sops = [e.entity_value for e in entities if e.entity_type == "SOP"]
        regs = [e.entity_value for e in entities if e.entity_type == "REGULATION"]
        print(f" - Unique Equipments: {set(eqs)}")
        print(f" - Unique SOPs: {set(sops)}")
        print(f" - Unique Regulations: {set(regs)}")
        assert "PUMP-07" in eqs, "PUMP-07 was not extracted"
        assert "VALVE-12" in eqs, "VALVE-12 was not extracted"

        # 4. Verify Knowledge Graph
        print("\n[4/5] Verifying Knowledge Graph...")
        graph_data = GraphService.query_graph_data(db)
        nodes = graph_data["nodes"]
        edges = graph_data["edges"]
        print(f" - Knowledge Graph Nodes: {len(nodes)}")
        print(f" - Knowledge Graph Edges: {len(edges)}")
        assert len(nodes) > 0, "No graph nodes generated"
        assert len(edges) > 0, "No graph edges generated"

        # 5. Verify Conflict Detection
        print("\n[5/5] Verifying Conflict Records...")
        conflicts = db.query(ConflictRecord).all()
        print(f"Total Active Conflicts Detected: {len(conflicts)}")
        for c in conflicts:
            print(f" - [{c.conflict_type}] Severity: {c.severity} - Description: {c.description[:100]}...")
        
        types = [c.conflict_type for c in conflicts]
        assert "SUPERSEDES_DOC" in types, "SUPERSEDES_DOC conflict was not detected"
        assert "CONTRADICTING_SOP" in types, "CONTRADICTING_SOP conflict was not detected"
        assert "MAINTENANCE_MISMATCH" in types, "MAINTENANCE_MISMATCH conflict was not detected"

        print("\n================ SYSTEM VERIFICATION SUCCESS ================")
        
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    verify_system_state()
