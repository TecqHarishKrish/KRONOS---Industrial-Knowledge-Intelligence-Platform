import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Shuffle, 
  ArrowRight, 
  Plus, 
  Minus, 
  AlertTriangle,
  Info, 
  HelpCircle
} from 'lucide-react';

interface CopilotData {
  glossary: Array<{ term: string; definition: string }>;
  next_actions: string[];
  regulatory_suggestions: string[];
}

const Evolution: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [docAId, setDocAId] = useState<string>('');
  const [docBId, setDocBId] = useState<string>('');
  
  const [diffResult, setDiffResult] = useState<any | null>(null);
  const [copilotData, setCopilotData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCopilot, setLoadingCopilot] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/v1/documents/', { headers });
      // Filter out completed ones
      const completed = res.data.filter((d: any) => d.status === 'completed');
      setDocuments(completed);
      
      // Auto pre-select versions of SOPs if present
      const sop42_v1 = completed.find((d: any) => d.filename === 'SOP-42-PUMP_v1.txt');
      const sop42_v2 = completed.find((d: any) => d.filename === 'SOP-42-PUMP_v2.txt');
      if (sop42_v1 && sop42_v2) {
        setDocAId(sop42_v1.id.toString());
        setDocBId(sop42_v2.id.toString());
      }
    } catch (err: any) {
      setError('Failed to fetch documents list');
    }
  };

  const handleCompare = async () => {
    if (!docAId || !docBId) {
      setError('Please select both versions to compare.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      setDiffResult(null);
      setCopilotData(null);

      // Compare call
      const diffRes = await axios.get(
        `http://localhost:8000/api/v1/evolution/compare?doc_a_id=${docAId}&doc_b_id=${docBId}`,
        { headers }
      );
      setDiffResult(diffRes.data);

      // Load copilot for Version B (the newer one)
      setLoadingCopilot(true);
      const copilotRes = await axios.get(
        `http://localhost:8000/api/v1/evolution/documents/${docBId}/copilot`,
        { headers }
      );
      setCopilotData(copilotRes.data);
      setLoadingCopilot(false);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to compare documents');
      setLoading(false);
      setLoadingCopilot(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Knowledge Evolution & SOP Diff Engine
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Perform side-by-side lineage diff checks and access engineering copilot definitions.
        </p>
      </div>

      {/* Select Versions Panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Document Version A (Older)
              </label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Document A...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} (v{d.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Document Version B (Newer)
              </label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Document B...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} (v{d.version})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-shrink-0 md:self-end">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
            >
              <Shuffle size={16} /> Compare Versions
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-3 font-semibold">{error}</p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {diffResult && (
        <div className="space-y-6">
          {/* AI Comparison Summary */}
          <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 flex gap-4">
            <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-400 mb-1">Version Evolution Summary</h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{diffResult.summary}</p>
            </div>
          </div>

          {/* Safety parameters updates */}
          {diffResult.safety_updates.length > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
              <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Compliance & Safety Parameter Updates
              </h4>
              <ul className="space-y-2">
                {diffResult.safety_updates.map((update: string, idx: number) => (
                  <li key={idx} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                    <span className="text-amber-500">•</span> {update}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Diff Grid blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Added and modified lines */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <Plus className="text-green-500" size={18} /> Added Instructions
              </h4>
              {diffResult.added.length > 0 ? (
                <div className="space-y-2">
                  {diffResult.added.map((line: string, idx: number) => (
                    <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl text-sm text-green-700 dark:text-green-400 font-mono">
                      + {line}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No clean lines added.</p>
              )}

              {diffResult.modified.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Shuffle className="text-amber-500" size={18} /> Modified Procedures
                  </h4>
                  {diffResult.modified.map((mod: any, idx: number) => (
                    <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 rounded-xl space-y-2 text-sm">
                      <div className="line-through text-red-500 dark:text-red-400 font-mono">- {mod.from}</div>
                      <div className="text-green-600 dark:text-green-400 font-mono flex items-center gap-2">
                        <ArrowRight size={14} /> + {mod.to}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Removed lines */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                <Minus className="text-red-500" size={18} /> Removed Instructions
              </h4>
              {diffResult.removed.length > 0 ? (
                <div className="space-y-2">
                  {diffResult.removed.map((line: string, idx: number) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-sm text-red-700 dark:text-red-400 font-mono">
                      - {line}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No lines removed.</p>
              )}
            </div>
          </div>

          {/* Copilot Engineering assistant */}
          {loadingCopilot ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-xs text-zinc-400">Loading copilot analysis...</span>
            </div>
          ) : copilotData && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HelpCircle className="text-blue-400" size={20} /> Engineering Copilot Assistant
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Glossary terms */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Technical Glossary</h4>
                  {copilotData.glossary.length > 0 ? (
                    <div className="space-y-3">
                      {copilotData.glossary.map((g, idx) => (
                        <div key={idx}>
                          <span className="text-sm font-bold text-blue-400">{g.term}: </span>
                          <span className="text-sm text-zinc-300">{g.definition}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No complex glossary terms detected.</p>
                  )}
                </div>

                {/* Suggested actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Suggested Next Actions</h4>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    {copilotData.next_actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500">•</span> {act}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Regulatory guidelines */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Compliance & Regulations</h4>
                  <ul className="space-y-2 text-sm text-zinc-300">
                    {copilotData.regulatory_suggestions.map((reg, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500">•</span> {reg}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Evolution;
