from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.auth import get_current_user
from backend.app.models.models import User
from seed_data import seed_database

router = APIRouter(prefix="/demo", tags=["demo"])

@router.post("/reset")
def reset_and_seed_v2_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset the database and re-seed the V2 operational manuals and incident records."""
    seed_database()
    return {"status": "success", "message": "Database successfully reset and seeded with KRONOS V2 logs."}

@router.get("/questions")
def get_guided_tour_questions():
    """List predefined questions for the guided tour workspace."""
    return [
        {
            "id": 1,
            "category": "Operational Integrity",
            "question": "Is there any operational pressure contradiction in the VALVE-12 guidelines?"
        },
        {
            "id": 2,
            "category": "Temporal Compliance",
            "question": "Which version of the SOP-42-PUMP procedure is currently active?"
        },
        {
            "id": 3,
            "category": "Maintenance Checks",
            "question": "Check if there are skipped inspections before PUMP-07 repairs."
        }
    ]

@router.get("/playback/{equipment_name}")
def get_equipment_lifecycle_playback(
    equipment_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve time-based chronological events logs for visual graph playback."""
    equip_upper = equipment_name.upper()
    
    if "PUMP" in equip_upper:
        events = [
            {"date": "2024-01-10", "state": "Installation", "title": "PUMP-07 Commissioning", "desc": "Brand new flow coolant pump PUMP-07 installed in Bay 4."},
            {"date": "2025-01-01", "state": "SOP Update", "title": "SOP-42-PUMP v1 Release", "desc": "SOP-42-PUMP v1 registered in database (validity start)."},
            {"date": "2026-01-01", "state": "SOP Update", "title": "SOP-42-PUMP v2 Release", "desc": "SOP-42-PUMP v2 released (increased threshold limit to 15 bar)."},
            {"date": "2026-06-15", "state": "Failure & Repair", "title": "Impeller Replacement", "desc": "Impeller replacement performed using superseded SOP version 1."},
            {"date": "2026-07-20", "state": "Repair", "title": "Seal Ring Gasket Check", "desc": "Seals repaired. Inspection skipped (sequencing mismatch warning)."}
        ]
    elif "VALVE" in equip_upper:
        events = [
            {"date": "2024-05-15", "state": "Installation", "title": "VALVE-12 Commissioning", "desc": "Primary gas valve VALVE-12 commissioned in Sector 3."},
            {"date": "2026-01-01", "state": "SOP Update", "title": "SOP-88-VALVE v1 Release", "desc": "SOP-88-VALVE v1 registered (6.0 bar pressure limit)."},
            {"date": "2026-03-01", "state": "Warning Alert", "title": "Secondary Guidelines Conflict", "desc": "Secondary guidelines set limit to 8.0 bar, violating master SOP."}
        ]
    else:
        events = [
            {"date": "2025-06-01", "state": "Installation", "title": "Component Commissioning", "desc": f"Equipment {equip_upper} installed."}
        ]

    return {
        "equipment_name": equip_upper,
        "events": events
    }
