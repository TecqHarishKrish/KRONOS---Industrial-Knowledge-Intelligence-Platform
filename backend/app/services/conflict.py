import re
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.models import Document, ExtractedEntity, ConflictRecord

logger = logging.getLogger(__name__)

class ConflictService:
    @staticmethod
    def detect_all_conflicts(db: Session) -> int:
        """
        Scan all active documents and incident logs to detect:
        1. CONTRADICTING_SOP: Different numerical thresholds (e.g., pressure) in active documents for the same SOP/Equipment.
        2. SUPERSEDES_DOC: Maintenance logs using a superseded version of an SOP.
        3. MAINTENANCE_MISMATCH: Skip in maintenance sequence (e.g. repair logged but inspection missing).
        """
        try:
            logger.info("Running conflict detection rules...")
            
            # Clear previous conflicts to rebuild
            db.query(ConflictRecord).delete()
            db.commit()
            
            conflicts_count = 0
            
            # 1. Contradicting SOP thresholds rule
            conflicts_count += ConflictService._detect_sop_contradictions(db)
            
            # 2. Superseded SOP usage rule
            conflicts_count += ConflictService._detect_superseded_usage(db)
            
            # 3. Maintenance sequencing mismatch rule
            conflicts_count += ConflictService._detect_maintenance_mismatches(db)
            
            logger.info(f"Conflict detection completed. Found {conflicts_count} conflicts.")
            return conflicts_count
            
        except Exception as e:
            logger.error(f"Error running conflict detection: {e}")
            db.rollback()
            return 0

    @staticmethod
    def _detect_sop_contradictions(db: Session) -> int:
        count = 0
        # Find active documents that contain "pressure" or temperature parameters
        active_docs = db.query(Document).filter(Document.is_active == True).all()
        
        # We can extract equipment tags and search for numbers close to 'pressure' or 'temperature'
        equipment_docs = {}
        for doc in active_docs:
            # Find equipment entities linked to this doc
            equip_ents = db.query(ExtractedEntity).filter(
                ExtractedEntity.document_id == doc.id,
                ExtractedEntity.entity_type == "EQUIPMENT"
            ).all()
            
            for eq in equip_ents:
                eq_val = eq.entity_value
                if eq_val not in equipment_docs:
                    equipment_docs[eq_val] = []
                equipment_docs[eq_val].append(doc)

        # For each equipment, check if multiple active SOPs/documents describe conflicting thresholds
        for eq_val, docs in equipment_docs.items():
            if len(docs) < 2:
                continue
            
            # Extract pressure settings from text
            # E.g. "pressure limit: 12 bar" or "pressure is 12.4 bar" or "operating threshold is 15 bar"
            pressures = []
            for doc in docs:
                text = doc.text_content or ""
                # Find pressure numbers
                matches = re.findall(r'(?:pressure|limit|threshold|max|operating)\s*(?:limit|is|at|threshold)?\s*[:\s-]*\s*(\d+(?:\.\d+)?)\s*(?:bar|psi|kpa)', text, re.IGNORECASE)
                if matches:
                    val = float(matches[0])
                    pressures.append((doc, val))

            # Compare pressures
            for i in range(len(pressures)):
                for j in range(i + 1, len(pressures)):
                    doc_a, val_a = pressures[i]
                    doc_b, val_b = pressures[j]
                    
                    if val_a != val_b:
                        # Conflict detected!
                        description = (
                            f"Conflicting pressure settings detected for {eq_val}. "
                            f"'{doc_a.filename}' specifies {val_a} bar, while "
                            f"'{doc_b.filename}' specifies {val_b} bar. Both are currently active."
                        )
                        record = ConflictRecord(
                            conflict_type="CONTRADICTING_SOP",
                            source_doc_id=doc_a.id,
                            target_doc_id=doc_b.id,
                            description=description,
                            severity="high"
                        )
                        db.add(record)
                        count += 1
        db.commit()
        return count

    @staticmethod
    def _detect_superseded_usage(db: Session) -> int:
        count = 0
        # Find all documents of type "Log" or "Incident"
        logs = db.query(Document).filter(Document.file_type.in_(["TXT", "PNG", "JPG", "JPEG"])).all()
        
        for log in logs:
            text = log.text_content or ""
            # Search for referenced SOPs in the text (e.g. "SOP-42-PUMP")
            sop_matches = re.findall(r'\bSOP-\d{2,4}(?:-[A-Za-z0-9]+)?\b', text, re.IGNORECASE)
            for sop_match in list(set(sop_matches)):
                sop_name = sop_match.upper()
                # Find the latest active document that represents this SOP
                active_sop_doc = db.query(Document).join(ExtractedEntity).filter(
                    ExtractedEntity.entity_type == "SOP",
                    ExtractedEntity.entity_value == sop_name,
                    Document.is_active == True
                ).first()

                if not active_sop_doc:
                    continue

                # Now check if this log references an older version
                # Look in the text for version indicator e.g. "using version 1" or "SOP version: 1"
                v_match = re.search(r'\b(?:version|v|rev\.?)\s*[:\s-]*\s*(\d+)\b', text, re.IGNORECASE)
                if v_match:
                    referenced_version = int(v_match.group(1))
                    if referenced_version < active_sop_doc.version:
                        # Log utilizes superseded SOP version!
                        description = (
                            f"Superseded SOP version referenced in log '{log.filename}'. "
                            f"It references {sop_name} version {referenced_version}, but the latest "
                            f"active version is version {active_sop_doc.version} ('{active_sop_doc.filename}')."
                        )
                        record = ConflictRecord(
                            conflict_type="SUPERSEDES_DOC",
                            source_doc_id=log.id,
                            target_doc_id=active_sop_doc.id,
                            description=description,
                            severity="medium"
                        )
                        db.add(record)
                        count += 1
        db.commit()
        return count

    @staticmethod
    def _detect_maintenance_mismatches(db: Session) -> int:
        count = 0
        # Find all maintenance logs that indicate a repair was performed
        # e.g., text contains "impeller replacement", "repair completed", "bearing replaced"
        all_docs = db.query(Document).all()
        
        repair_logs = []
        inspection_logs = []
        
        for doc in all_docs:
            text = (doc.text_content or "").lower()
            # Check for equipment tag
            equip_ents = db.query(ExtractedEntity).filter(
                ExtractedEntity.document_id == doc.id,
                ExtractedEntity.entity_type == "EQUIPMENT"
            ).all()
            if not equip_ents:
                continue
            
            equip_val = equip_ents[0].entity_value
            
            if "repair" in text or "replace" in text or "maintenance" in text:
                repair_logs.append((doc, equip_val))
            elif "inspect" in text or "check" in text or "audit" in text:
                inspection_logs.append((doc, equip_val))

        for repair_doc, equip_val in repair_logs:
            # Check if there exists an inspection log for the same equipment dated before the repair
            # Let's say within 30 days before repair_doc.uploaded_at
            repair_time = repair_doc.uploaded_at or datetime.now()
            
            matching_inspections = [
                insp_doc for insp_doc, eq in inspection_logs 
                if eq == equip_val and insp_doc.uploaded_at < repair_time and repair_time - insp_doc.uploaded_at <= timedelta(days=30)
            ]
            
            if not matching_inspections:
                description = (
                    f"Maintenance sequencing anomaly for {equip_val}. "
                    f"A repair action ('{repair_doc.filename}') was performed, "
                    f"but no inspection report was filed within the preceding 30 days."
                )
                record = ConflictRecord(
                    conflict_type="MAINTENANCE_MISMATCH",
                    source_doc_id=repair_doc.id,
                    target_doc_id=None,
                    description=description,
                    severity="medium"
                )
                db.add(record)
                count += 1
                
        db.commit()
        return count
