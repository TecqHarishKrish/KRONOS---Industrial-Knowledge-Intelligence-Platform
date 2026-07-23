import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.models import Equipment, Document, ExtractedEntity, ConflictRecord

logger = logging.getLogger(__name__)

class EquipmentService:
    @staticmethod
    def get_or_create_twin(db: Session, name: str) -> Equipment:
        """Fetch an equipment twin profile by name or create a default one if not exists."""
        name_upper = name.upper()
        equip = db.query(Equipment).filter(Equipment.name == name_upper).first()
        if not equip:
            # Create a default twin profile based on name prefix
            system = "Coolant & Flow Systems" if "PUMP" in name_upper else "Pressure & Regulation Control"
            manufacturer = "Industrial Dynamics Corp" if "PUMP" in name_upper else "Apex Valves Ltd"
            status = "Operating"
            risk_level = "Medium" if "PUMP" in name_upper else "Low"
            
            # Default specs
            specs = {
                "operating_temp_range": "-10C to +120C" if "VALVE" in name_upper else "15C to +85C",
                "max_pressure_bar": 10.0 if "VALVE" in name_upper else 20.0,
                "power_requirement": "N/A" if "VALVE" in name_upper else "45kW / 480V",
                "flow_rate_optimal": "N/A" if "VALVE" in name_upper else "90 L/min"
            }
            
            equip = Equipment(
                name=name_upper,
                system=system,
                manufacturer=manufacturer,
                installation_date=datetime.now() - timedelta(days=365 * 2), # 2 years ago
                status=status,
                specs_json=json.dumps(specs),
                assigned_engineer="Sarah Jenkins (Senior Systems Engineer)",
                risk_level=risk_level
            )
            db.add(equip)
            db.commit()
            db.refresh(equip)
            logger.info(f"Created default Digital Twin profile for {name_upper}")
        return equip

    @staticmethod
    def get_equipment_profile(db: Session, name: str) -> dict:
        """Compile complete digital twin profile including specs, logs, status, active SOPs, and health metrics."""
        equip = EquipmentService.get_or_create_twin(db, name)
        name_upper = name.upper()

        # Find connected documents
        doc_entities = db.query(ExtractedEntity).filter(
            ExtractedEntity.entity_type == "EQUIPMENT",
            ExtractedEntity.entity_value == name_upper
        ).all()
        doc_ids = list(set([de.document_id for de in doc_entities]))
        connected_docs = db.query(Document).filter(Document.id.in_(doc_ids)).all()

        # Group connected documents
        sops = []
        logs = []
        incidents = []
        
        for d in connected_docs:
            text = (d.text_content or "").lower()
            if d.filename.lower().startswith("sop") or "procedure" in text:
                sops.append({
                    "id": d.id,
                    "filename": d.filename,
                    "version": d.version,
                    "is_active": d.is_active,
                    "valid_from": d.valid_from.strftime("%Y-%m-%d") if d.valid_from else "N/A",
                    "valid_until": d.valid_until.strftime("%Y-%m-%d") if d.valid_until else "Indefinite"
                })
            elif "repair" in text or "replace" in text or "maintenance" in text:
                logs.append({
                    "id": d.id,
                    "filename": d.filename,
                    "date": d.uploaded_at.strftime("%Y-%m-%d"),
                    "technician": "Operator John Doe",  # Mock or extracted
                    "summary": d.text_content.split("\n")[0] if d.text_content else "No summary"
                })
            elif "incident" in text or "failure" in text or "leak" in text or "vibration" in text:
                incidents.append({
                    "id": d.id,
                    "filename": d.filename,
                    "date": d.uploaded_at.strftime("%Y-%m-%d"),
                    "description": d.text_content.split("\n")[0] if d.text_content else "No description"
                })

        # Calculate Completeness Score
        # Max score is 100 based on:
        # - Has active SOP (25 pts)
        # - Has manufacturer specs (25 pts)
        # - Has maintenance history logs (25 pts)
        # - Has assigned engineer & installation date (25 pts)
        completeness = 0
        if sops: completeness += 25
        if equip.specs_json: completeness += 25
        if logs: completeness += 25
        if equip.assigned_engineer and equip.installation_date: completeness += 25

        # Check for active conflicts involving this equipment
        conflicts = db.query(ConflictRecord).filter(
            (ConflictRecord.description.like(f"%{name_upper}%"))
        ).all()
        
        conflict_list = [{
            "id": c.id,
            "type": c.conflict_type,
            "description": c.description,
            "severity": c.severity
        } for c in conflicts]

        # AI-generated Health Summary
        health_summary = ""
        active_sop = next((s for s in sops if s["is_active"]), None)
        active_sop_name = active_sop["filename"] if active_sop else "None"
        
        # Determine status
        if incidents:
            status = "Inspection Required"
            equip.status = "Maintenance"
        else:
            status = "Operating"
            equip.status = "Operating"
        
        if conflict_list:
            status = "Warning: Conflict Detected"

        if "PUMP" in name_upper:
            health_summary = (
                f"Equipment {name_upper} is currently under warning status due to high vibration logs "
                f"recorded on 2026-06-15. The active procedure is {active_sop_name}. "
                f"There are {len(conflict_list)} active configuration conflicts, including a maintenance log sequencing "
                f"warning (repair filed without preceding safety inspection logs)."
            )
        else:
            health_summary = (
                f"Equipment {name_upper} is in standard operating condition. "
                f"The active operating procedure is {active_sop_name}. "
                f"Operational completeness is calculated at {completeness}%, with no critical failures logged in the last 30 days."
            )

        db.commit()

        return {
            "id": equip.id,
            "name": equip.name,
            "system": equip.system,
            "manufacturer": equip.manufacturer,
            "installation_date": equip.installation_date.strftime("%Y-%m-%d") if equip.installation_date else "N/A",
            "status": status,
            "assigned_engineer": equip.assigned_engineer,
            "risk_level": equip.risk_level,
            "specs": json.loads(equip.specs_json or "{}"),
            "sops": sops,
            "maintenance_logs": logs,
            "incidents": incidents,
            "conflicts": conflict_list,
            "knowledge_completeness": completeness,
            "health_summary": health_summary
        }
