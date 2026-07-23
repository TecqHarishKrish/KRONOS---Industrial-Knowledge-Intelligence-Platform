from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Document, ExtractedEntity, ConflictRecord, User
from backend.app.services.auth import get_current_user
from backend.app.schemas.schemas import ConflictResponse

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard")
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total documents
    total_docs = db.query(Document).count()

    # Total equipment count
    total_equip = db.query(ExtractedEntity).filter(
        ExtractedEntity.entity_type == "EQUIPMENT"
    ).distinct(ExtractedEntity.entity_value).count()

    # Total incidents count
    total_incidents = db.query(ExtractedEntity).filter(
        ExtractedEntity.entity_type == "INCIDENT"
    ).distinct(ExtractedEntity.entity_value).count()

    # Active conflicts count
    total_conflicts = db.query(ConflictRecord).count()

    # Recent uploads
    recent_docs_db = db.query(Document).order_by(Document.uploaded_at.desc()).limit(5).all()
    recent_docs = [{
        "id": d.id,
        "filename": d.filename,
        "file_type": d.file_type,
        "status": d.status,
        "version": d.version,
        "uploaded_at": d.uploaded_at.strftime("%Y-%m-%d %H:%M")
    } for d in recent_docs_db]

    # File type distribution (e.g. PDF, TXT, Image)
    type_counts = db.query(
        Document.file_type, func.count(Document.id)
    ).group_by(Document.file_type).all()
    
    category_distribution = [{"name": row[0], "value": row[1]} for row in type_counts]

    # Conflict list
    conflicts_db = db.query(ConflictRecord).all()
    conflicts = []
    for c in conflicts_db:
        src_name = c.source_doc.filename if c.source_doc else None
        tgt_name = c.target_doc.filename if c.target_doc else None
        conflicts.append({
            "id": c.id,
            "conflict_type": c.conflict_type,
            "source_doc_filename": src_name,
            "target_doc_filename": tgt_name,
            "description": c.description,
            "severity": c.severity,
            "detected_at": c.detected_at.strftime("%Y-%m-%d %H:%M")
        })

    # Equipment queries/mentions trends
    equip_mentions = db.query(
        ExtractedEntity.entity_value, func.count(ExtractedEntity.id)
    ).filter(
        ExtractedEntity.entity_type == "EQUIPMENT"
    ).group_by(ExtractedEntity.entity_value).order_by(func.count(ExtractedEntity.id).desc()).limit(5).all()

    equip_trends = [{"name": row[0], "value": row[1]} for row in equip_mentions]

    return {
        "summary": {
            "total_documents": total_docs,
            "total_equipment": total_equip,
            "total_incidents": total_incidents,
            "total_conflicts": total_conflicts
        },
        "recent_uploads": recent_docs,
        "category_distribution": category_distribution,
        "conflicts": conflicts,
        "equipment_trends": equip_trends
    }


from backend.app.services.health import HealthAnalyticsService

@router.get("/health")
def get_knowledge_health_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculates coverage, completeness, duplicates, freshness and returns a global health score."""
    return HealthAnalyticsService.calculate_health_score(db)

@router.get("/gaps")
def get_knowledge_gaps_detector(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detects missing manuals, skipped inspections, incomplete metadata, and orphan graph nodes."""
    return HealthAnalyticsService.detect_knowledge_gaps(db)

@router.get("/alerts")
def get_predictive_risk_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns document-based predictive operational risks (e.g. repeated failures, outdated procedures)."""
    return HealthAnalyticsService.get_predictive_alerts(db)

@router.get("/executive")
def get_executive_summary_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns high-level statistics and executive recommendations."""
    return HealthAnalyticsService.get_executive_dashboard(db)

