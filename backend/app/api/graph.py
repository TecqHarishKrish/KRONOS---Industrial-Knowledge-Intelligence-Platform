from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.schemas import GraphDataResponse
from backend.app.services.auth import get_current_user
from backend.app.services.graph import GraphService
from backend.app.models.models import User

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/", response_model=GraphDataResponse)
def get_graph_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return GraphService.query_graph_data(db)
