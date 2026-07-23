from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.schemas import EquipmentResponse
from backend.app.services.auth import get_current_user
from backend.app.services.equipment import EquipmentService
from backend.app.models.models import User, Equipment

router = APIRouter(prefix="/equipment", tags=["equipment"])

@router.get("/", response_model=List[EquipmentResponse])
def list_equipment_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all equipment twins in database."""
    return db.query(Equipment).all()

@router.get("/{name}")
def get_equipment_profile_detail(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve complete living profile (Digital Twin memory) for specific equipment."""
    profile = EquipmentService.get_equipment_profile(db, name)
    if not profile:
        raise HTTPException(status_code=404, detail="Equipment twin profile not found")
    return profile
