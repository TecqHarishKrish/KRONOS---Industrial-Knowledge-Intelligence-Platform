from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# Auth schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "Technician"  # Admin, Engineer, Technician, Manager

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None


# Document schemas
class ExtractedEntityResponse(BaseModel):
    id: int
    entity_type: str
    entity_value: str
    confidence: float
    char_start: Optional[int]
    char_end: Optional[int]

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    status: str
    size_bytes: int
    uploaded_at: datetime
    version: int
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    is_active: bool
    text_content: Optional[str] = None
    entities: List[ExtractedEntityResponse] = []

    class Config:
        from_attributes = True


# Conflict schemas
class ConflictResponse(BaseModel):
    id: int
    conflict_type: str
    source_doc_id: Optional[int]
    source_doc_filename: Optional[str] = None
    target_doc_id: Optional[int]
    target_doc_filename: Optional[str] = None
    description: str
    severity: str
    detected_at: datetime

    class Config:
        from_attributes = True


# Chat schemas
class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(ChatMessageBase):
    id: int
    citations_json: Optional[str] = None
    timeline_json: Optional[str] = None
    graph_nodes_json: Optional[str] = None
    confidence_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatConversationCreate(BaseModel):
    title: str

class ChatConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatConversationDetailResponse(ChatConversationResponse):
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


# Graph schemas
class GraphNodeResponse(BaseModel):
    id: int
    name: str
    node_type: str
    properties: Dict[str, Any] = {}

class GraphEdgeResponse(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
    relation_type: str
    properties: Dict[str, Any] = {}

class GraphDataResponse(BaseModel):
    nodes: List[GraphNodeResponse]
    edges: List[GraphEdgeResponse]


# Equipment schemas
class EquipmentResponse(BaseModel):
    id: int
    name: str
    system: Optional[str] = None
    manufacturer: Optional[str] = None
    installation_date: Optional[datetime] = None
    status: str
    specs_json: Optional[str] = None
    assigned_engineer: Optional[str] = None
    risk_level: str

    class Config:
        from_attributes = True


# Lessons Learned schemas
class LessonsLearnedResponse(BaseModel):
    id: int
    incident_doc_id: int
    equipment_name: str
    root_cause_summary: str
    lessons: str
    prevention_checklist: str
    recommended_sop_updates: Optional[str] = None

    class Config:
        from_attributes = True

