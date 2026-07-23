from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import ChatConversation, ChatMessage, User
from backend.app.schemas.schemas import (
    ChatConversationCreate,
    ChatConversationResponse,
    ChatConversationDetailResponse,
    ChatMessageCreate,
    ChatMessageResponse
)
from backend.app.services.auth import get_current_user
from backend.app.services.agents import AgentCoordinator

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/conversations", response_model=ChatConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: ChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_conv = ChatConversation(user_id=current_user.id, title=conv_in.title)
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv

@router.get("/conversations", response_model=List[ChatConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ChatConversation).filter(
        ChatConversation.user_id == current_user.id
    ).order_by(ChatConversation.created_at.desc()).all()

@router.get("/conversations/{conversation_id}", response_model=ChatConversationDetailResponse)
def get_conversation_details(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()
    
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    return conv

@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    msg_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify conversation exists and belongs to user
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id,
        ChatConversation.user_id == current_user.id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # 1. Save user message to database
    db_user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=msg_in.content
    )
    db.add(db_user_msg)
    db.commit()

    # 2. Trigger multi-agent reasoning to generate assistant message
    db_assistant_msg = AgentCoordinator.answer_query(db, msg_in.content, conversation_id)

    return db_assistant_msg
