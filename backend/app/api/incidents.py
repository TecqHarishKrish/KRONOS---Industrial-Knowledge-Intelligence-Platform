import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.auth import get_current_user
from backend.app.services.reasoning import ReasoningService
from backend.app.models.models import User, LessonsLearned, Document

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("/{doc_id}/root-cause")
def get_root_cause_analysis_chain(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve cause-effect root-cause logic chain for specific incident document."""
    res = ReasoningService.get_root_cause_chain(db, doc_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

@router.get("/{doc_id}/similar")
def get_similar_historical_incidents(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get semantically ranked similar incidents for this failure log."""
    return ReasoningService.find_similar_incidents(db, doc_id)

@router.get("/{doc_id}/lessons-learned")
def get_incident_lessons_learned(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch or generate lessons learned & checklists for an incident log."""
    try:
        lessons = ReasoningService.get_lessons_learned(db, doc_id)
        return {
            "id": lessons.id,
            "incident_doc_id": lessons.incident_doc_id,
            "equipment_name": lessons.equipment_name,
            "root_cause_summary": lessons.root_cause_summary,
            "lessons": lessons.lessons.split("\n"),
            "prevention_checklist": json.loads(lessons.prevention_checklist),
            "recommended_sop_updates": lessons.recommended_sop_updates
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{doc_id}/investigate")
def run_incident_investigation_workflow(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run Investigation Mode: compile timelines, find root causes, search similarity, write checklists."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Incident document not found")

    # Compile all reasoning details
    root_cause = ReasoningService.get_root_cause_chain(db, doc_id)
    similar = ReasoningService.find_similar_incidents(db, doc_id)
    lessons_db = ReasoningService.get_lessons_learned(db, doc_id)
    
    lessons = {
        "root_cause_summary": lessons_db.root_cause_summary,
        "lessons": lessons_db.lessons.split("\n"),
        "prevention_checklist": json.loads(lessons_db.prevention_checklist),
        "recommended_sop_updates": lessons_db.recommended_sop_updates
    }

    # Generate a download-ready investigation report string/markdown
    checklist_md = "\n".join([f"- [ ] {item}" for item in lessons["prevention_checklist"]])
    lessons_md = "\n".join([f"- {l}" for l in lessons["lessons"]])
    
    report_md = (
        f"# KRONOS INDUSTRIAL MEMORY OS — FAILURE INVESTIGATION REPORT\n"
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        f"Investigated Log: {doc.filename}\n"
        f"Scope Component: {lessons_db.equipment_name}\n"
        f"Role: {current_user.role} ({current_user.username})\n\n"
        f"## 1. ROOT CAUSE SUMMARY\n"
        f"{lessons['root_cause_summary']}\n\n"
        f"## 2. LESSONS LEARNED\n"
        f"{lessons_md}\n\n"
        f"## 3. PREVENTATIVE MAINTENANCE CHECKLIST\n"
        f"{checklist_md}\n\n"
        f"## 4. RECOMMENDED SOP AMENDMENTS\n"
        f"{lessons['recommended_sop_updates']}\n"
    )

    return {
        "status": "completed",
        "investigation_report": report_md,
        "root_cause": root_cause,
        "similar_incidents": similar,
        "lessons_learned": lessons
    }

from datetime import datetime
