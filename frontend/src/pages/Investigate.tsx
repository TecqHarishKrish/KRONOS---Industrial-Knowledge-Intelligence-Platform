import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Download, 
  GitBranch, 
  CheckSquare, 
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

const Investigate: React.FC = () => {
  const { token } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncId, setSelectedIncId] = useState<string>('');
  const [report, setReport] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/documents/', { headers });
      // Find files that are maintenance or failure logs
      const filtered = res.data.filter((d: any) => 
        d.status === 'completed' && 
        (d.filename.toLowerCase().includes('log') || 
         d.filename.toLowerCase().includes('repair') || 
         d.filename.toLowerCase().includes('guideline'))
      );
      setIncidents(filtered);
      if (filtered.length > 0) {
        setSelectedIncId(filtered[0].id.toString());
      }
    } catch (err: any) {
      setError('Failed to fetch incidents');
    }
  };

  const handleInvestigate = async () => {
    if (!selectedIncId) return;
    try {
      setError('');
      setLoading(true);
      setReport(null);

      const res = await axios.post(`http://localhost:8000/api/v1/incidents/${selectedIncId}/investigate`, {}, { headers });
      setReport(res.data);
      
      // Initialize checklist state
      const initialChecklist: Record<string, boolean> = {};
      res.data.lessons_learned.prevention_checklist.forEach((item: string) => {
        initialChecklist[item] = false;
      });
      setChecklistState(initialChecklist);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to generate investigation report.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncId) {
      handleInvestigate();
    }
  }, [selectedIncId]);

  const toggleCheck = (item: string) => {
    setChecklistState(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const downloadReport = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([report.investigation_report], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Failure_Investigation_Report_${selectedIncId}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Failure & Incident Investigation OS
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Traverse root-cause chains, compare similar failures, and compile Lessons Learned.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <select
            value={selectedIncId}
            onChange={(e) => setSelectedIncId(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.filename}
              </option>
            ))}
          </select>

          <button
            onClick={downloadReport}
            disabled={!report}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors"
          >
            <Download size={16} /> Export PDF/MD
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Timelines & Cause-Effect Reasoning Chain */}
          <div className="lg:col-span-2 space-y-6">
            {/* Root cause tree */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <GitBranch className="text-blue-500" size={18} /> Root Cause Reasoning Chain
              </h4>
              <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-100 dark:before:bg-zinc-800">
                {report.root_cause.nodes.map((node: any, idx: number) => (
                  <div key={node.id} className="relative space-y-1">
                    <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border border-white dark:border-zinc-900"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                        Level {idx + 1}
                      </span>
                      <ArrowRight size={12} className="text-zinc-400" />
                      <h5 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {node.label}
                      </h5>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{node.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar historical incidents */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <Layers className="text-blue-500" size={18} /> Similar Historical Incidents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.similar_incidents.map((sim: any, idx: number) => (
                  <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{sim.filename}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        {sim.similarity_percentage}% Similar
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Equipment: {sim.equipment} | Downtime: {sim.downtime}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold mt-1">Root Cause: <span className="font-normal text-zinc-600 dark:text-zinc-300">{sim.root_cause}</span></p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Resolution: <span className="font-normal text-zinc-600 dark:text-zinc-300">{sim.resolution}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Lessons Learned & Checklists */}
          <div className="space-y-6">
            {/* Root cause summary */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <ShieldAlert className="text-amber-500" size={18} /> Root Cause Summary
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {report.lessons_learned.root_cause_summary}
              </p>
            </div>

            {/* Lessons learned checklist */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <CheckSquare className="text-blue-500" size={18} /> Preventative Checklist
              </h4>
              <div className="space-y-2">
                {report.lessons_learned.prevention_checklist.map((item: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => toggleCheck(item)}
                    className="w-full flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800/80 rounded-xl text-left transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checklistState[item] || false}
                      onChange={() => {}} // handled by parent click
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 bg-zinc-100 border-zinc-300"
                    />
                    <span className={`text-xs text-zinc-700 dark:text-zinc-300 ${checklistState[item] ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended SOP updates */}
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
              <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> Recommended SOP Updates
              </h4>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {report.lessons_learned.recommended_sop_updates}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investigate;
