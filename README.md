# KRONOS — Industrial Knowledge Intelligence Platform

KRONOS is an industrial knowledge intelligence system that acts as a digital memory for engineering, plant, and factory operations. It ingests technical documents, extracts entities, constructs versioning chains in a temporal knowledge graph, flags operational conflicts, and delivers cited, explainable natural-language responses.

---

## 1. Tech Stack

### Backend
* **FastAPI:** High-performance async REST API framework.
* **SQLAlchemy & SQLite:** Database models for users, documents, messages, graph elements, and conflicts.
* **NetworkX:** Temporal knowledge graph storage, querying, and pathfinding.
* **Sentence Transformers:** Semantic vector embedding (`all-MiniLM-L6-v2`) running locally.
* **Tesseract OCR (Fallback Mock):** Scanned image and PDF page layout text parsing.
* **PBKDF2-SHA256:** Standard library password hashing (zero external binary compatibility issues).

### Frontend
* **React + Vite + TypeScript:** Modern responsive single-page application framework.
* **Tailwind CSS v4:** Sleek dark industrial theme, optimized fonts, and custom components.
* **Apache ECharts:** Force-directed network diagram for Knowledge Graphs and dashboard analytics.
* **Lucide Icons:** Unified vector icon set.

---

## 2. Directory Structure

```text
kronos/
├── backend/
│   ├── app/
│   │   ├── api/                # API routes (auth, documents, chat, graph, analytics)
│   │   ├── core/               # Configuration settings, SQLite session, security
│   │   ├── models/             # SQLAlchemy DB schemas
│   │   ├── schemas/            # Pydantic request/response validation schemas
│   │   ├── services/           # Services (OCR, Extraction, Graph, Search, Temporal, Conflict, Agents)
│   │   └── main.py             # FastAPI App entrypoint
│   ├── requirements.txt        # Backend dependencies
│   └── Dockerfile              # Docker recipe for backend
├── frontend/
│   ├── src/
│   │   ├── components/         # Shared UI (Sidebar, Layout elements)
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # Pages (Dashboard, Upload, Documents, Assistant, Timeline, Graph, Settings)
│   │   ├── services/           # Axios client configuration
│   │   ├── App.tsx             # Routing configuration
│   │   ├── index.css           # Global stylesheet with Tailwind v4
│   │   └── main.tsx            # React mounting
│   ├── package.json            # Node scripts and dependencies
│   └── Dockerfile              # Docker recipe for frontend Nginx serving
├── docker-compose.yml          # Container orchestration configuration
├── seed_data.py                # Database seeding CLI script (Populates DB with Pump-7 files)
└── README.md                   # Platform documentation
```

---

## 3. Local Setup & Running

### Prerequisites
* **Python 3.10+**
* **Node.js v24+ & npm**

### Step 1: Backend Setup
1. Create a python virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate the virtual environment:
   * **Windows Powershell:** `.venv\Scripts\Activate.ps1`
   * **Linux/macOS:** `source .venv/bin/activate`
3. Install dependencies:
   ```bash
   .venv\Scripts\pip install -r backend/requirements.txt
   .venv\Scripts\pip install pydantic-settings
   ```

### Step 2: Seed the Database
Seed KRONOS with initial operational documents, user accounts, and conflict states:
```bash
.venv\Scripts\python seed_data.py
```
*Creates the database in `backend/data/kronos.db` and writes 6 sample technical files.*

### Step 3: Run the Backend
Launch the FastAPI development server:
```bash
.venv\Scripts\python -m uvicorn backend.app.main:app --port 8000 --reload
```
*API docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### Step 4: Run the Frontend
1. Open a new terminal in the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development dev server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## 4. Run with Docker Compose

Build and launch the complete stack inside containers:
```bash
docker compose up --build
```
* Serves the **Frontend UI** on: [http://localhost](http://localhost) (Port 80)
* Serves the **Backend API** on: [http://localhost:8000](http://localhost:8000)

---

## 5. Sample User Accounts

Log in to KRONOS using the seeded accounts:

| Username | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | Admin | Full Access (Ingestion, DB resets, View) |
| **engineer** | `engineer123` | Engineer | Standard uploads and Chat |
| **tech** | `tech123` | Technician | View documents, timeline, and run chat |
| **manager** | `manager123` | Manager | Read-only analytics and conflicts logs |

---

## 6. Verification Queries to Test

Try entering these query strings in the **Chat Assistant**:
* `"What happened to Pump-7?"` — Retrieves the casing repair logs, impeller replacements, and lists them side-by-side with timeline paths.
* `"Which SOP is active?"` — Finds SOP-42-PUMP version 2 as the latest active, notes that version 1 has been superseded.
* `"Is there any conflict in the uploaded documents?"` — Flags that `valve12_pressure_guidelines.txt` specifies 8.0 bar while `SOP-88-VALVE_v1.txt` specifies 6.0 bar, marking a contradicting SOP warning.
* `"Check Pump-7 maintenance logs"` — Triggers a warning showing that casing seals were repaired, but no safety inspection was logged within the required preceding 30 days.
