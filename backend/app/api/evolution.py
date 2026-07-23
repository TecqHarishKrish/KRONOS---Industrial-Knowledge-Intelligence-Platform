from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.auth import get_current_user
from backend.app.services.evolution import EvolutionService
from backend.app.models.models import User

router = APIRouter(prefix="/evolution", tags=["evolution"])

@router.get("/compare")
def compare_document_versions(
    doc_a_id: int,
    doc_b_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Line-by-line comparison of two document versions."""
    res = EvolutionService.compare_documents(db, doc_a_id, doc_b_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.get("/documents/{id}/copilot")
def get_document_copilot_assistant(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Contextual terminology, suggestions, next actions, and compliance guides for a document."""
    res = EvolutionService.get_document_copilot(db, id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
