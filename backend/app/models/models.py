from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="Technician")  # Admin, Engineer, Technician, Manager
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("ChatConversation", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # PDF, DOCX, TXT, CSV, Excel, PNG, JPG, ZIP
    file_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="processing")  # processing, completed, failed
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    version = Column(Integer, default=1)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    text_content = Column(Text, nullable=True)

    entities = relationship("ExtractedEntity", back_populates="document", cascade="all, delete-orphan")


class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String, nullable=False)  # EQUIPMENT, INCIDENT, SOP, REGULATION, DATE, PERSON, LOCATION
    entity_value = Column(String, nullable=False, index=True)
    confidence = Column(Float, default=1.0)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)

    document = relationship("Document", back_populates="entities")


class ConflictRecord(Base):
    __tablename__ = "conflict_records"

    id = Column(Integer, primary_key=True, index=True)
    conflict_type = Column(String, nullable=False)  # CONTRADICTING_SOP, SUPERSEDED_DOC, MAINTENANCE_MISMATCH, REGULATION_INCONSISTENCY
    source_doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    target_doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False, default="medium")  # low, medium, high
    detected_at = Column(DateTime, default=datetime.utcnow)

    source_doc = relationship("Document", foreign_keys=[source_doc_id])
    target_doc = relationship("Document", foreign_keys=[target_doc_id])


class GraphNode(Base):
    __tablename__ = "graph_nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    node_type = Column(String, nullable=False, index=True)  # Document, Equipment, Incident, SOP, Regulation, Date, Person
    properties_json = Column(Text, nullable=True)  # JSON string of attributes


class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_node_id = Column(Integer, nullable=False)
    target_node_id = Column(Integer, nullable=False)
    relation_type = Column(String, nullable=False, index=True)  # RELATED_TO, SUPERSEDES, REPLACED_BY, PRECEDES, CAUSES, FIXED_BY, REFERENCES
    properties_json = Column(Text, nullable=True)  # JSON string of attributes


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)  # JSON array of document references (id, title, page)
    timeline_json = Column(Text, nullable=True)  # JSON array of timeline items
    graph_nodes_json = Column(Text, nullable=True)  # JSON array of related graph nodes
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("ChatConversation", back_populates="messages")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    system = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    installation_date = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="Operating")  # Operating, Maintenance, Failed
    specs_json = Column(Text, nullable=True)  # specifications JSON
    assigned_engineer = Column(String, nullable=True)
    risk_level = Column(String, nullable=False, default="Low")  # Low, Medium, High


class LessonsLearned(Base):
    __tablename__ = "lessons_learned"

    id = Column(Integer, primary_key=True, index=True)
    incident_doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    equipment_name = Column(String, nullable=False, index=True)
    root_cause_summary = Column(Text, nullable=False)
    lessons = Column(Text, nullable=False)
    prevention_checklist = Column(Text, nullable=False)  # JSON string
    recommended_sop_updates = Column(Text, nullable=True)

