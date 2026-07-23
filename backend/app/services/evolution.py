import difflib
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.models import Document, ExtractedEntity

logger = logging.getLogger(__name__)

class EvolutionService:
    @staticmethod
    def compare_documents(db: Session, doc_a_id: int, doc_b_id: int) -> Dict[str, Any]:
        """Perform side-by-side line-by-line diff of two document versions, extracting added, removed, and changed text."""
        doc_a = db.query(Document).filter(Document.id == doc_a_id).first()
        doc_b = db.query(Document).filter(Document.id == doc_b_id).first()

        if not doc_a or not doc_b:
            return {"error": "One or both documents not found."}

        text_a = doc_a.text_content or ""
        text_b = doc_b.text_content or ""

        lines_a = [l.strip() for l in text_a.split("\n")]
        lines_b = [l.strip() for l in text_b.split("\n")]

        diff = list(difflib.ndiff(lines_a, lines_b))

        added_lines = []
        removed_lines = []
        modified_lines = []
        unchanged_lines = []
        safety_updates = []

        for line in diff:
            marker = line[:2]
            content = line[2:].strip()
            if not content:
                continue

            if marker == "+ ":
                added_lines.append(content)
                # Check for safety instructions
                if any(w in content.lower() for w in ["safety", "pressure", "bar", "limit", "warning", "hazard", "lock"]):
                  safety_updates.append(f"Added safety parameter: {content}")
            elif marker == "- ":
                removed_lines.append(content)
            elif marker == "? ":
                # ndiff prints ? for intra-line differences, we can skip or use it
                continue
            else:
                unchanged_lines.append(content)

        # Standard heuristics to group modifications:
        # If an added line shares > 60% words with a removed line, mark as modified
        final_added = []
        final_modified = []
        
        for add_line in added_lines:
            matched = False
            for rem_line in removed_lines:
                # Calculate word overlap
                words_add = set(add_line.lower().split())
                words_rem = set(rem_line.lower().split())
                overlap = words_add.intersection(words_rem)
                
                # Check ratio
                if len(overlap) / max(len(words_add), 1) > 0.4:
                    final_modified.append({
                        "from": rem_line,
                        "to": add_line
                    })
                    removed_lines.remove(rem_line)
                    matched = True
                    break
            if not matched:
                final_added.append(add_line)

        # AI summary paragraph
        summary = (
            f"Comparison between Version {doc_a.version} ('{doc_a.filename}') and "
            f"Version {doc_b.version} ('{doc_b.filename}') reveals {len(final_added)} additions, "
            f"{len(removed_lines)} removals, and {len(final_modified)} modified instructions. "
            f"Crucially, {len(safety_updates)} safety and operational threshold adjustments were identified."
        )

        return {
            "document_a": {
                "id": doc_a.id,
                "filename": doc_a.filename,
                "version": doc_a.version
            },
            "document_b": {
                "id": doc_b.id,
                "filename": doc_b.filename,
                "version": doc_b.version
            },
            "added": final_added,
            "removed": removed_lines,
            "modified": final_modified,
            "safety_updates": safety_updates,
            "summary": summary
        }

    @staticmethod
    def get_document_copilot(db: Session, doc_id: int) -> Dict[str, Any]:
        """Generate contextual copilot data (glossary, suggestions, related documents)."""
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return {"error": "Document not found"}

        text = doc.text_content or ""
        
        # 1. Technical terminology glossary
        glossary = []
        if "impeller" in text.lower():
            glossary.append({"term": "Impeller", "definition": "A rotating component of a centrifugal pump which transfers energy from the motor to the fluid."})
        if "casing" in text.lower():
            glossary.append({"term": "Casing", "definition": "The shell casing containing the impeller that channels the liquid in and out of the pump casing."})
        if "vibration" in text.lower():
            glossary.append({"term": "Vibration Limit", "definition": "The maximum acceptable oscillating movement (measured in mm/s) allowed before component failure occurs."})
        if "bar" in text.lower() or "pressure" in text.lower():
            glossary.append({"term": "Bar", "definition": "A metric unit of pressure equal to 100,000 Pascals, roughly equivalent to atmospheric pressure."})
        if "lock-out" in text.lower():
            glossary.append({"term": "Lock-out Tag-out", "definition": "Safety procedure used to ensure that machines are properly shut off and not started up prior to completion."})

        # 2. Next suggested maintenance actions
        next_actions = []
        if "pump" in doc.filename.lower():
            next_actions = [
                "Schedule casing bearing lubrication check (required within 30 days).",
                "Calibrate radial casing pressure sensors.",
                "Inspect impeller wear rings for clearances."
            ]
        elif "valve" in doc.filename.lower():
            next_actions = [
                "Perform safety lock-out tag-out audit on VALVE-12.",
                "Calibrate temperature seal parameters."
            ]
        else:
            next_actions = ["Schedule standard routine maintenance log reviews."]

        # 3. Regulatory references suggestions
        reg_entities = db.query(ExtractedEntity).filter(
            ExtractedEntity.document_id == doc_id,
            ExtractedEntity.entity_type == "REGULATION"
        ).all()
        
        reg_suggestions = []
        for reg in reg_entities:
            reg_suggestions.append(f"Ensure procedure meets compliance standard {reg.entity_value} parameters.")
        if not reg_suggestions:
            reg_suggestions = ["No explicit regulatory standards are referenced in this document."]

        return {
            "document_id": doc.id,
            "filename": doc.filename,
            "glossary": glossary,
            "next_actions": next_actions,
            "regulatory_suggestions": reg_suggestions
        }
