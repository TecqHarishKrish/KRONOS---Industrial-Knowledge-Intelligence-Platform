# Implementation Plan: KRONOS V2 — Industrial Memory OS

This plan details the V2 enhancements to transform KRONOS from a document intelligence system into a complete **Industrial Memory Operating System**. The upgrade focuses on Digital Twin memory profiles, version lineage evolution, root-cause analysis, incident similarity matching, knowledge health tracking, and interactive playback visualization.

---

## Technical Enhancements & Proposed Changes

We will introduce V2 modules, extend SQLite database schemas (maintaining backward compatibility), create new backend services, and develop frontend page views.

### 1. Database Schema Extension ([models.py](file:///d:/ET/backend/app/models/models.py))
To implement **Digital Twin Memory** (Module 1), we will add an explicit `Equipment` table:
* **Equipment:** `id` (int, PK), `name` (str, unique index, matching equipment tags like `PUMP-07`), `system` (str), `manufacturer` (str), `installation_date` (datetime), `status` (str: Operating, Maintenance, Failed), `specs_json` (Text, JSON dict of specifications), `assigned_engineer` (str), `risk_level` (str: Low, Medium, High).
* We will link documents, incidents, and logs to this table through dynamic query filtering on extracted entity tags.

---

### 2. Backend Services & API Endpoints

#### [Component: Equipment Profiles (Digital Twin)]
* **New Service:** `EquipmentService` to manage digital twin creation, specs updates, and timeline lifecycle generation.
* **New API Route ([equipment.py](file:///d:/ET/backend/app/api/equipment.py)):**
  * `GET /equipment` -> List all equipment twin profiles.
  * `GET /equipment/{name}` -> Fetch detailed digital twin profile (specs, history, SOPs, active logs, health summaries).
  * `POST /equipment` -> Create/Update equipment specifications.

#### [Component: Knowledge Evolution & SOP Comparison (Modules 2, 8, 11)]
* **New Service:** `EvolutionService` to perform line-by-side text comparisons between document versions.
* **New API Route ([evolution.py](file:///d:/ET/backend/app/api/evolution.py)):**
  * `GET /evolution/compare?doc_a_id=1&doc_b_id=2` -> Returns added, removed, modified lines, and safety updates.
  * `GET /documents/{id}/copilot` -> Returns contextual glossary, terminology explanations, and next suggested actions.

#### [Component: Root Cause & Incident Similarity (Modules 3, 4, 7)]
* **New Service:** `ReasoningService` to generate root-cause graphs (cause-effect chains) and search for similar incidents using vector similarity.
* **New API Route ([incidents.py](file:///d:/ET/backend/app/api/incidents.py)):**
  * `GET /incidents/{doc_id}/root-cause` -> Returns hierarchical nodes for cause-effect tree (e.g. Missed Lubrication -> Bearing Wear -> High Temp -> Pump Failure).
  * `GET /incidents/{doc_id}/similar` -> Returns top similar historical incidents, similarity %, resolution steps, and downtime.
  * `POST /incidents/{doc_id}/investigate` -> Runs an investigation report (timeline, causes, lessons learned, prevention checklist).

#### [Component: Health Score, Gaps, and Alerts (Modules 5, 9, 10, 13)]
* **New Service:** `HealthAnalyticsService` to compute health score (0-100), identify orphan nodes or missing documents (gap detector), and run predictive alerts (failure trends).
* **New API Route ([analytics.py](file:///d:/ET/backend/app/api/analytics.py) - EXTEND):**
  * `GET /analytics/health` -> Calculates documentation coverage, graph integrity, freshness, and gaps.
  * `GET /analytics/gaps` -> Detailed orphan nodes and missing reference lists.
  * `GET /analytics/alerts` -> Proactive operational alerts (e.g., equipment showing high repeat failure risks).
  * `GET /analytics/executive` -> Executive summary stats and risk reports.

#### [Component: Graph Playback (Module 12)]
* **New API Route ([graph.py](file:///d:/ET/backend/app/api/graph.py) - EXTEND):**
  * `GET /graph/playback/{equipment_name}` -> Returns an ordered array of historical state events (Installation -> Maintenance -> Failure -> Repair -> SOP Update) for ECharts animation playbacks.

#### [Component: Demo Mode (Module 16)]
* **New API Route ([demo.py](file:///d:/ET/backend/app/api/demo.py)):**
  * `POST /demo/reset` -> Clears database and seeds advanced KRONOS V2 files (incorporating specific details for Valve-12, Pump-7, and OSHA guidelines).
  * `GET /demo/questions` -> List of pre-defined guided questions.

---

### 3. Frontend UI Enhancement

* **Dashboard Upgrade:** Add Knowledge Health Score cards, Predictive Alerts, executive quick actions, and executive report triggers.
* **New Pages:**
  * **Equipment Profiles (`/equipment` & `/equipment/:name`):** Tabs displaying specs, maintenance cards, incident graphs, active SOP versions, and AI summaries.
  * **Knowledge Evolution (`/evolution`):** Dropdowns to select Document A and Document B to show side-by-side diff highlight comparisons.
  * **Incident Investigation (`/investigate`):** Step-by-step incident investigation workspace showcasing similarity matches, lessons learned check cards, and PDF report triggers.
  * **Demo Mode Workspace (`/demo`):** An animated tour guide panel with predefined questions, graph playback, and quick-reset seeding.
* **Navigation:** Update sidebar links and implement visual improvements (skeletons, error toasts).

---

## Verification & Testing Plan

### Automated Tests
* Create `test_app_v2.py` verifying:
  * Digital twin schema insertion, relational counts.
  * Line-by-line document diff engine accuracy.
  * Root cause chain tree format.
  * Incident similarity metric computations.
  * Knowledge gap analysis counters.

### Manual Verification
* Access `/demo` to seed KRONOS V2 data.
* Navigate through the Equipment Profile, Version Evolution, and Incident Investigation tabs.
* Verify graph playback scrubber animation is interactive.
