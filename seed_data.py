import os
import sys
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, Document, ExtractedEntity, ConflictRecord, GraphNode, GraphEdge, Equipment
from backend.app.services.ocr import OCRService
from backend.app.services.extraction import ExtractionService
from backend.app.services.search import SearchService
from backend.app.services.temporal import TemporalService
from backend.app.services.conflict import ConflictService
from backend.app.services.equipment import EquipmentService

def seed_database():
    print("Resetting database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Users
        print("Seeding users...")
        users = [
            User(username="admin", password_hash=get_password_hash("admin123"), role="Admin"),
            User(username="engineer", password_hash=get_password_hash("engineer123"), role="Engineer"),
            User(username="tech", password_hash=get_password_hash("tech123"), role="Technician"),
            User(username="manager", password_hash=get_password_hash("manager123"), role="Manager"),
        ]
        db.add_all(users)
        db.commit()

        # 2. Seed Sample Documents
        print("Seeding documents...")
        sample_docs = [
            {
                "filename": "SOP-42-PUMP_v1.txt",
                "file_type": "TXT",
                "text_content": (
                    "SOP-42-PUMP Standard Operating Procedure.\n"
                    "Version 1\n"
                    "Valid From: 2025-01-01\n"
                    "Valid Until: 2025-12-31\n"
                    "Equipment: PUMP-07\n"
                    "System: Main Coolant Pump\n"
                    "Operating pressure limit is 12.0 bar.\n"
                    "Flow threshold limit is 80 L/min.\n"
                    "Regulation Reference: ISO-9001"
                ),
                "uploaded_at": datetime.now() - timedelta(days=200),
                "version": 1,
                "valid_from": datetime(2025, 1, 1),
                "valid_until": datetime(2025, 12, 31),
            },
            {
                "filename": "SOP-42-PUMP_v2.txt",
                "file_type": "TXT",
                "text_content": (
                    "SOP-42-PUMP Standard Operating Procedure.\n"
                    "Version 2\n"
                    "Valid From: 2026-01-01\n"
                    "Valid Until: 2028-12-31\n"
                    "Equipment: PUMP-07\n"
                    "System: Main Coolant Pump\n"
                    "Operating pressure limit is 15.0 bar.\n"
                    "Flow threshold limit is 95 L/min.\n"
                    "Regulation Reference: ISO-9001"
                ),
                "uploaded_at": datetime.now() - timedelta(days=100),
                "version": 2,
                "valid_from": datetime(2026, 1, 1),
                "valid_until": datetime(2028, 12, 31),
            },
            {
                "filename": "maintenance_log_pump07_01.txt",
                "file_type": "TXT",
                "text_content": (
                    "PUMP-07 Maintenance Action Log.\n"
                    "Date: 2026-06-15\n"
                    "Technician: Operator John Doe\n"
                    "Equipment: PUMP-07\n"
                    "Action Performed: Impeller replacement and casing clearance check.\n"
                    "Tested operational pressure up to 12.0 bar.\n"
                    "Followed SOP-42-PUMP using version 1 guidelines."
                ),
                "uploaded_at": datetime.now() - timedelta(days=15),
                "version": 1,
                "valid_from": None,
                "valid_until": None,
            },
            {
                "filename": "SOP-88-VALVE_v1.txt",
                "file_type": "TXT",
                "text_content": (
                    "SOP-88-VALVE Standard Operating Procedure.\n"
                    "Version 1\n"
                    "Valid From: 2026-01-01\n"
                    "Equipment: VALVE-12\n"
                    "Operating pressure limit is 6.0 bar.\n"
                    "Regulations: OSHA-1910.147 lock-out tag-out required."
                ),
                "uploaded_at": datetime.now() - timedelta(days=80),
                "version": 1,
                "valid_from": datetime(2026, 1, 1),
                "valid_until": None,
            },
            {
                "filename": "valve12_pressure_guidelines.txt",
                "file_type": "TXT",
                "text_content": (
                    "VALVE-12 Secondary Pressure Guidelines.\n"
                    "Version 1\n"
                    "Valid From: 2026-03-01\n"
                    "Equipment: VALVE-12\n"
                    "SOP reference: SOP-88-VALVE\n"
                    "Check: Set operating pressure limit is 8.0 bar during high-temperature runs."
                ),
                "uploaded_at": datetime.now() - timedelta(days=60),
                "version": 1,
                "valid_from": datetime(2026, 3, 1),
                "valid_until": None,
            },
            {
                "filename": "pump07_casing_repair.txt",
                "file_type": "TXT",
                "text_content": (
                    "PUMP-07 Casing Repair Action Report.\n"
                    "Date: 2026-07-20\n"
                    "Technician: Operator John Doe\n"
                    "Equipment: PUMP-07\n"
                    "Action: Replaced worn casing seal and lubricated bearings.\n"
                    "No inspection report found prior, but repaired successfully."
                ),
                "uploaded_at": datetime.now() - timedelta(days=2),
                "version": 1,
                "valid_from": None,
                "valid_until": None,
            }
        ]

        # Write docs to DB & run extractor
        for doc_data in sample_docs:
            filename = doc_data["filename"]
            file_path = os.path.join("data", "uploads", filename)
            
            # Ensure upload folder exists and write mock files
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(doc_data["text_content"])

            db_doc = Document(
                filename=filename,
                file_type=doc_data["file_type"],
                file_path=file_path,
                status="processing",
                size_bytes=len(doc_data["text_content"]),
                uploaded_at=doc_data["uploaded_at"],
                version=doc_data["version"],
                valid_from=doc_data["valid_from"],
                valid_until=doc_data["valid_until"],
                text_content=doc_data["text_content"],
                is_active=True
            )
            db.add(db_doc)
            db.commit()
            db.refresh(db_doc)

            # Extract entities & update graph
            print(f"Extracting entities for {filename}...")
            ExtractionService.extract_entities_and_relations(db, db_doc)

            # Index in vector search
            print(f"Indexing vector store for {filename}...")
            SearchService.index_document(db_doc.id, db_doc.text_content)

            db_doc.status = "completed"
            db.commit()

        # 3. Resolve active versions & detect conflicts
        print("Resolving temporal active statuses...")
        TemporalService.resolve_active_versions(db)

        print("Detecting database conflicts...")
        ConflictService.detect_all_conflicts(db)

        print("Seeding digital twin equipment profiles...")
        EquipmentService.get_or_create_twin(db, "PUMP-07")
        EquipmentService.get_or_create_twin(db, "VALVE-12")

        print("Database seeded successfully!")

    except Exception as e:
        print(f"Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
