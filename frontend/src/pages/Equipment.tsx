import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Wrench, 
  Cpu, 
  User, 
  ShieldAlert, 
  Activity, 
  FileText, 
  AlertTriangle
} from 'lucide-react';

interface EquipmentTwin {
  id: number;
  name: string;
  system: string;
  manufacturer: string;
  installation_date: string;
  status: string;
  assigned_engineer: string;
  risk_level: string;
  specs: Record<string, any>;
  sops: any[];
  maintenance_logs: any[];
  incidents: any[];
  conflicts: any[];
  knowledge_completeness: number;
  health_summary: string;
}

const Equipment: React.FC = () => {
  const { token } = useAuth();
  const [twins, setTwins] = useState<any[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<EquipmentTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTwins();
  }, []);

  const fetchTwins = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8000/api/v1/equipment/', { headers });
      setTwins(res.data);
      if (res.data.length > 0) {
        fetchTwinDetail(res.data[0].name);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError('Failed to load equipment list');
      setLoading(false);
    }
  };

  const fetchTwinDetail = async (name: string) => {
    try {
      setError('');
      const res = await axios.get(`http://localhost:8000/api/v1/equipment/${name}`, { headers });
      setSelectedTwin(res.data);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to load equipment details');
    }
  };

  if (loading && twins.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Digital Twin Memory OS
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Living profiles and knowledge completeness graphs for industrial systems.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Components List
          </h3>
          <div className="space-y-2">
            {twins.map((twin) => (
              <button
                key={twin.id}
                onClick={() => fetchTwinDetail(twin.name)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                  selectedTwin?.name === twin.name
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedTwin?.name === twin.name ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    <Wrench size={16} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{twin.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{twin.status}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-3">
          {selectedTwin ? (
            <div className="space-y-6">
              {/* Header Profile Summary */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl text-blue-600 dark:text-blue-400">
                      <Cpu size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{selectedTwin.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedTwin.status.includes('Warning') 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>
                          {selectedTwin.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{selectedTwin.system} | Manufacturer: {selectedTwin.manufacturer}</p>
                    </div>
                  </div>

                  <div className="w-full md:w-48 space-y-2">
                    <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      <span>Knowledge Completeness</span>
                      <span>{selectedTwin.knowledge_completeness}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedTwin.knowledge_completeness}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <User className="text-zinc-500" size={18} />
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Assigned Engineer</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedTwin.assigned_engineer}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldAlert className="text-zinc-500" size={18} />
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Risk Profile Level</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedTwin.risk_level}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Activity className="text-zinc-500" size={18} />
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Installation Date</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedTwin.installation_date}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Health Summary */}
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6">
                <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Activity size={16} /> AI Health Summary
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedTwin.health_summary}
                </p>
              </div>

              {/* Specs & Logs tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Specifications */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <Cpu size={18} /> Technical Specifications
                  </h4>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {Object.entries(selectedTwin.specs).map(([key, val]) => (
                      <div key={key} className="py-3 flex justify-between text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{val as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected SOPs */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                    <FileText size={18} /> Operational Guidelines (SOPs)
                  </h4>
                  {selectedTwin.sops.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTwin.sops.map((sop) => (
                        <div key={sop.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{sop.filename}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Ver: {sop.version} | Active: {sop.is_active ? 'Yes' : 'No'}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sop.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            {sop.is_active ? 'Active' : 'Superseded'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No connected SOP files found.</p>
                  )}
                </div>
              </div>

              {/* Maintenance History */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                  <Activity size={18} /> Maintenance & Repairs Timeline
                </h4>
                {selectedTwin.maintenance_logs.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTwin.maintenance_logs.map((log) => (
                      <div key={log.id} className="border-l-2 border-blue-500 pl-4 space-y-1 relative">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></div>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{log.filename}</p>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{log.date}</span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Logged by: {log.technician}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{log.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No maintenance actions logged.</p>
                )}
              </div>

              {/* Active Warnings & Conflicts */}
              {selectedTwin.conflicts.length > 0 && (
                <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6">
                  <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} /> Active Configuration Conflicts
                  </h4>
                  <div className="space-y-3">
                    {selectedTwin.conflicts.map((c) => (
                      <div key={c.id} className="flex gap-3 text-sm p-3 bg-white dark:bg-zinc-900 border border-amber-200/60 dark:border-amber-900/20 rounded-xl">
                        <AlertTriangle className="text-amber-500 flex-shrink-0" size={18} />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{c.type.replace(/_/g, ' ')}</p>
                          <p className="text-zinc-600 dark:text-zinc-300 mt-1">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="text-zinc-500 dark:text-zinc-400">No equipment profile selected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Equipment;
