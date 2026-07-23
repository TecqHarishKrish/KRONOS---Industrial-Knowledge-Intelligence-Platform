import re
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import ExtractedEntity, Document
from backend.app.services.graph import GraphService

class ExtractionService:
    EQUIPMENT_REGEX = re.compile(r'\b[A-Za-z]{3,10}-\d{2,4}\b')
    SOP_REGEX = re.compile(r'\bSOP-\d{2,4}(?:-[A-Za-z0-9]+)?\b', re.IGNORECASE)
    REGULATION_REGEX = re.compile(r'\b(?:OSHA|ISO|API|ASME|EPA)-\d{3,5}(?:\.\d{3,5})?\b', re.IGNORECASE)
    DATE_REGEX = re.compile(r'\b\d{4}-\d{2}-\d{2}\b')
    VERSION_REGEX = re.compile(r'\b(?:version|ver|v|rev\.?)\s*(\d+(?:\.\d+)?)\b', re.IGNORECASE)

    @classmethod
    def extract_entities_and_relations(cls, db: Session, doc: Document) -> List[ExtractedEntity]:
        text = doc.text_content or ""
        entities_data = []

        # Extract Equipment
        equipments = list(set(cls.EQUIPMENT_REGEX.findall(text)))
        for equip in equipments:
            entities_data.append({
                "type": "EQUIPMENT",
                "value": equip.upper()
            })

        # Extract SOPs
        sops = list(set(cls.SOP_REGEX.findall(text)))
        for sop in sops:
            entities_data.append({
                "type": "SOP",
                "value": sop.upper()
            })

        # Extract Regulations
        regs = list(set(cls.REGULATION_REGEX.findall(text)))
        for reg in regs:
            entities_data.append({
                "type": "REGULATION",
                "value": reg.upper()
            })

        # Extract Dates
        dates = list(set(cls.DATE_REGEX.findall(text)))
        for d in dates:
            entities_data.append({
                "type": "DATE",
                "value": d
            })

        # Version detection
        version_match = cls.VERSION_REGEX.search(text)
        if version_match:
            try:
                version_num = int(float(version_match.group(1)))
                doc.version = version_num
            except Exception:
                pass

        # Try parsing valid_from and valid_until from dates or content
        # E.g. "Valid From: 2026-01-01"
        valid_from_match = re.search(r'valid\s+from\s*:\s*(\d{4}-\d{2}-\d{2})', text, re.IGNORECASE)
        if valid_from_match:
            try:
                doc.valid_from = datetime.strptime(valid_from_match.group(1), "%Y-%m-%d")
            except Exception:
                pass
        
        valid_until_match = re.search(r'valid\s+until\s*:\s*(\d{4}-\d{2}-\d{2})', text, re.IGNORECASE)
        if valid_until_match:
            try:
                doc.valid_until = datetime.strptime(valid_until_match.group(1), "%Y-%m-%d")
            except Exception:
                pass

        # Fallback values for validity if missing but dates exist
        if not doc.valid_from and dates:
            try:
                doc.valid_from = datetime.strptime(min(dates), "%Y-%m-%d")
            except Exception:
                pass

        # Parse Person names (e.g. Technician: John Doe, Inspector: John Doe)
        person_matches = re.findall(r'(?:technician|inspector|engineer|operator)\s*:\s*([A-Za-z\s]{3,20})\b', text, re.IGNORECASE)
        for person in list(set(person_matches)):
            entities_data.append({
                "type": "PERSON",
                "value": person.strip().title()
            })

        # Check for incident context
        incident_matches = re.findall(r'\b(?:incident|accident|failure|failure-code)\b', text, re.IGNORECASE)
        if incident_matches or "leak" in text.lower() or "rupture" in text.lower() or "vibration" in text.lower():
            # If there's incident indicators, extract or mock an incident entity
            inc_code = f"INC-{doc.id or 1:04d}"
            # Check if there is an explicit incident code (like INC-2026-08)
            explicit_inc = re.search(r'\bINC-\d{4}-\d{2,4}\b', text, re.IGNORECASE)
            if explicit_inc:
                inc_code = explicit_inc.group(0).upper()
            entities_data.append({
                "type": "INCIDENT",
                "value": inc_code
            })

        # Save to DB
        created_entities = []
        for ent in entities_data:
            # Check duplicate in this document
            exists = db.query(ExtractedEntity).filter(
                ExtractedEntity.document_id == doc.id,
                ExtractedEntity.entity_type == ent["type"],
                ExtractedEntity.entity_value == ent["value"]
            ).first()
            
            if not exists:
                db_ent = ExtractedEntity(
                    document_id=doc.id,
                    entity_type=ent["type"],
                    entity_value=ent["value"],
                    confidence=1.0
                )
                db.add(db_ent)
                created_entities.append(db_ent)
        
        db.commit()

        # Update the Knowledge Graph nodes and edges for this document
        GraphService.add_document_to_graph(db, doc, created_entities)

        return created_entities
