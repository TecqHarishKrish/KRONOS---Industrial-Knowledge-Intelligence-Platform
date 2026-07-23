import React from 'react';
import { Shield, Server, Database } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Platform Settings
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Monitor system deployment variables, local models availability, and database logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Settings */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Server size={18} className="text-blue-500" />
            Backend Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">REST API URL</span>
              <p className="font-mono text-zinc-700 dark:text-zinc-300">http://localhost:8000/api/v1</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">SQLite DB URI</span>
              <p className="font-mono text-zinc-700 dark:text-zinc-300">sqlite:///./data/kronos.db</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Embeddings model</span>
              <p className="font-mono text-zinc-700 dark:text-zinc-300">sentence-transformers/all-MiniLM-L6-v2</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">OCR Provider</span>
              <p className="font-mono text-zinc-700 dark:text-zinc-300">Tesseract OCR (Fallback Mock enabled)</p>
            </div>
          </div>
        </div>

        {/* Security / Role Info */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <Shield size={18} className="text-emerald-500" />
            Access Permissions
          </h3>
          <div className="space-y-3 text-xs leading-relaxed text-zinc-500">
            <p>
              Your current session is governed by role-based credentials.
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Admin:</strong> Uploads, resets, edits allowed.</li>
              <li><strong>Engineer:</strong> Standard operation views & uploads allowed.</li>
              <li><strong>Technician:</strong> View access to documents & chats.</li>
              <li><strong>Manager:</strong> View-only analytics.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Logs / Diagnostics */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
          <Database size={18} className="text-indigo-500" />
          Real-time System Logs
        </h3>
        <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-4 font-mono text-xs text-zinc-300 h-64 overflow-y-auto space-y-1.5 leading-normal">
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  backend.app.main: Initializing database tables...</p>
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  backend.app.main: Database tables initialized successfully.</p>
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  uvicorn.error: Started server process [29520]</p>
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  uvicorn.error: Waiting for application startup.</p>
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  uvicorn.error: Application startup complete.</p>
          <p className="text-zinc-500">[2026-07-23 09:12:42] INFO  uvicorn.error: Uvicorn running on http://127.0.0.1:8000</p>
          <p className="text-blue-400">[2026-07-23 09:12:56] INFO  backend.app.services.graph: Loading graph from SQLite...</p>
          <p className="text-blue-400">[2026-07-23 09:12:56] INFO  backend.app.services.graph: Loaded 14 nodes and 23 edges.</p>
          <p className="text-emerald-400">[2026-07-23 09:13:02] INFO  backend.app.services.temporal: Resolving document validity periods...</p>
          <p className="text-emerald-400">[2026-07-23 09:13:02] INFO  backend.app.services.temporal: SOP-42-PUMP v1.txt deactivated (superseded by v2).</p>
          <p className="text-amber-400">[2026-07-23 09:13:05] WARNING backend.app.services.conflict: CONTRADICTING_SOP detected: valve12_pressure_guidelines.txt vs SOP-88-VALVE_v1.txt</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
