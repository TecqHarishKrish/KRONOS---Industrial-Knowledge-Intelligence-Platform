import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.core.database import SessionLocal
from backend.app.models.models import Equipment, LessonsLearned, Document
from backend.app.services.equipment import EquipmentService
from backend.app.services.evolution import EvolutionService
from backend.app.services.reasoning import ReasoningService
from backend.app.services.health import HealthAnalyticsService

def verify_v2_system_state():
    print("================ KRONOS V2 SYSTEM VERIFICATION ================")
    db = SessionLocal()
    try:
        # 1. Verify Digital Twin
        print("\n[1/6] Verifying Digital Twin Memory...")
        equip_list = db.query(Equipment).all()
        print(f"Total Equipment Twins: {len(equip_list)}")
        for eq in equip_list:
            print(f" - Twin: '{eq.name}' (System: {eq.system}) - Status: {eq.status}")
        assert len(equip_list) >= 2, "Seeded equipment twins are missing"

        profile = EquipmentService.get_equipment_profile(db, "PUMP-07")
        print(f" - Profile completeness for PUMP-07: {profile['knowledge_completeness']}%")
        assert profile['knowledge_completeness'] > 50, "Completeness calculation is incorrect"

        # 2. Verify SOP evolution comparison
        print("\n[2/6] Verifying SOP Evolution Comparison...")
        doc_a = db.query(Document).filter(Document.filename == "SOP-42-PUMP_v1.txt").first()
        doc_b = db.query(Document).filter(Document.filename == "SOP-42-PUMP_v2.txt").first()
        assert doc_a and doc_b, "SOP documents missing"

        diff_res = EvolutionService.compare_documents(db, doc_a.id, doc_b.id)
        print(f" - Added lines: {len(diff_res['added'])} | Removed: {len(diff_res['removed'])} | Modified: {len(diff_res['modified'])}")
        print(f" - Safety updates detected: {len(diff_res['safety_updates'])}")
        assert len(diff_res['safety_updates']) > 0, "No safety updates detected in SOP evolution"

        copilot_res = EvolutionService.get_document_copilot(db, doc_a.id)
        print(f" - Glossary terms: {len(copilot_res['glossary'])} | Suggested actions: {len(copilot_res['next_actions'])}")
        assert len(copilot_res['glossary']) > 0, "Copilot glossary is empty"

        # 3. Verify Root Cause Reasoning
        print("\n[3/6] Verifying Root Cause Reasoning Chains...")
        rc_res = ReasoningService.get_root_cause_chain(db, doc_a.id)
        print(f" - Root cause nodes count: {len(rc_res['nodes'])}")
        assert len(rc_res['nodes']) > 0, "Root cause graph node chain is empty"

        # 4. Verify Incident Similarity
        print("\n[4/6] Verifying Incident Similarity Engine...")
        similar_res = ReasoningService.find_similar_incidents(db, doc_a.id)
        print(f" - Similar incidents found: {len(similar_res)}")
        for sim in similar_res:
            print(f"   - Match: {sim['filename']} ({sim['similarity_percentage']}% similar)")

        # 5. Verify Health score metrics
        print("\n[5/6] Verifying Knowledge Health Scores...")
        health = HealthAnalyticsService.calculate_health_score(db)
        print(f" - Knowledge Health Score: {health['global_score']}/100")
        print(f" - Recommendations count: {len(health['recommendations'])}")
        assert health['global_score'] > 0, "Global health score calculation failed"

        # 6. Verify Gap detector
        print("\n[6/6] Verifying Knowledge Gap Detector...")
        gaps = HealthAnalyticsService.detect_knowledge_gaps(db)
        print(f" - Missing SOPs: {len(gaps['missing_sops'])}")
        print(f" - Missing Inspections: {len(gaps['missing_inspections'])}")
        print(f" - Orphan nodes count: {len(gaps['orphan_graph_nodes'])}")

        print("\n================ SYSTEM V2 VERIFICATION SUCCESS ================")

    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    verify_v2_system_state()
