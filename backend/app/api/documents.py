import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models.models import Document, User
from backend.app.schemas.schemas import DocumentResponse
from backend.app.services.auth import get_current_user, RoleChecker
from backend.app.services.ocr import OCRService
from backend.app.services.extraction import ExtractionService
from backend.app.services.search import SearchService
from backend.app.services.temporal import TemporalService
from backend.app.services.conflict import ConflictService

router = APIRouter(prefix="/documents", tags=["documents"])

def process_uploaded_document(db: Session, doc_id: int):
    """Background task to extract text, run OCR, run entity extraction, index in vector, and check conflicts."""
    db_doc = db.query(Document).filter(Document.id == doc_id).first()
    if not db_doc:
        return

    try:
        # 1. Extract text (supports OCR fallbacks)
        text = OCRService.extract_text(db_doc.file_path, db_doc.file_type)
        db_doc.text_content = text
        db.commit()

        # 2. Extract entities and update graph
        ExtractionService.extract_entities_and_relations(db, db_doc)

        # 3. Vector indexing
        SearchService.index_document(db_doc.id, text)

        # 4. Resolve temporal version statuses
        TemporalService.resolve_active_versions(db)

        # 5. Detect conflicts
        ConflictService.detect_all_conflicts(db)

        # 6. Update status
        db_doc.status = "completed"
        db.commit()
    except Exception as e:
        db_doc.status = "failed"
        db.commit()
        raise e

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["Admin", "Engineer", "Manager"]))
):
    # Validate file type
    filename = file.filename
    ext = os.path.splitext(filename)[1].replace(".", "").upper()
    allowed_types = ["PDF", "DOCX", "TXT", "CSV", "XLS", "XLSX", "PNG", "JPG", "JPEG", "ZIP"]
    
    if ext not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension {ext} not allowed. Supported: {', '.join(allowed_types)}"
        )

    # Save file to disk
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    # Avoid duplicate file overwrite by appending suffix if exists
    base, extension = os.path.splitext(filename)
    counter = 1
    while os.path.exists(file_path):
        filename = f"{base}_{counter}{extension}"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        counter += 1

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {e}"
        )

    file_size = os.path.getsize(file_path)

    # Save document meta to DB
    db_doc = Document(
        filename=filename,
        file_type=ext,
        file_path=file_path,
        status="processing",
        size_bytes=file_size,
        version=1,
        is_active=True
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # Trigger processing in background
    background_tasks.add_task(process_uploaded_document, db, db_doc.id)

    return db_doc

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Document).order_by(Document.uploaded_at.desc()).all()

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return doc

@router.get("/{doc_id}/history", response_model=List[DocumentResponse])
def get_document_history(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = TemporalService.get_document_history_chain(db, doc_id)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document version chain not found"
        )
    return history
