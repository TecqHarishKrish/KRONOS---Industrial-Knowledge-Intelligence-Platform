import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  FileText, 
  Cpu, 
  AlertTriangle, 
  Clock, 
  AlertOctagon 
} from 'lucide-react';
import api from '../services/api';

interface SummaryData {
  total_documents: number;
  total_equipment: number;
  total_incidents: number;
  total_conflicts: number;
}

interface RecentUpload {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  version: number;
  uploaded_at: string;
}

interface Conflict {
  id: number;
  conflict_type: string;
  source_doc_filename: string;
  target_doc_filename: string;
  description: string;
  severity: string;
  detected_at: string;
}

interface ChartItem {
  name: string;
  value: number;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData>({
    total_documents: 0,
    total_equipment: 0,
    total_incidents: 0,
    total_conflicts: 0
  });
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [categoryData, setCategoryData] = useState<ChartItem[]>([]);
  const [trendData, setTrendData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        const data = response.data;
        setSummary(data.summary);
        setRecentUploads(data.recent_uploads);
        setConflicts(data.conflicts);
        setCategoryData(data.category_distribution);
        setTrendData(data.equipment_trends);
      } catch (error) {
        console.error('Failed to load dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // ECharts File Category Pie Configuration
  const getPieOption = () => {
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'horizontal',
        bottom: '0',
        textStyle: { color: '#a1a1aa' }
      },
      series: [
        {
          name: 'Format',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0c0c0f',
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#fafafa'
            }
          },
          labelLine: { show: false },
          data: categoryData.length > 0 ? categoryData : [{ name: 'None', value: 0 }],
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        }
      ]
    };
  };

  // ECharts Equipment Trend Bar Configuration
  const getBarOption = () => {
    const xData = trendData.map(item => item.name);
    const yData = trendData.map(item => item.value);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: '#a1a1aa' },
        axisLine: { lineStyle: { color: '#1e1e24' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#a1a1aa' },
        axisLine: { lineStyle: { color: '#1e1e24' } },
        splitLine: { lineStyle: { color: '#1e1e24' } }
      },
      series: [
        {
          name: 'Mentions',
          type: 'bar',
          barWidth: '40%',
          data: yData,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: '#2563eb'
          }
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Analytics Dashboard
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Industrial knowledge graphs, conflict indicators, and system metrics at a glance.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Documents */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Documents</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_documents}</h3>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-blue-600 dark:text-blue-400">
            <FileText size={24} />
          </div>
        </div>

        {/* Total Equipment */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Equipment</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_equipment}</h3>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Cpu size={24} />
          </div>
        </div>

        {/* Total Incidents */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Incidents</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_incidents}</h3>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-amber-600 dark:text-amber-400">
            <Clock size={24} />
          </div>
        </div>

        {/* Active Conflicts */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Conflicts</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_conflicts}</h3>
          </div>
          <div className={`p-3 rounded-lg ${summary.total_conflicts > 0 ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-400'}`}>
            <AlertOctagon size={24} />
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mb-4">Document Category Distribution</h3>
          <div className="h-64">
            <ReactECharts option={getPieOption()} style={{ height: '100%' }} />
          </div>
        </div>

        {/* Equipment Mentions Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mb-4">Top Queried/Mentioned Equipment</h3>
          <div className="h-64">
            <ReactECharts option={getBarOption()} style={{ height: '100%' }} />
          </div>
        </div>
      </div>

      {/* Tables and Alerts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Recent Uploaded Documents</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500">
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">Format</th>
                  <th className="px-6 py-3.5">Version</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-zinc-900 dark:text-zinc-200">
                {recentUploads.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/50">
                    <td className="px-6 py-3.5 font-medium max-w-[200px] truncate">{doc.filename}</td>
                    <td className="px-6 py-3.5">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono text-xs">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">v{doc.version}</td>
                    <td className="px-6 py-3.5 text-zinc-500">{doc.uploaded_at}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === 'completed' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400' 
                          : doc.status === 'failed'
                          ? 'bg-rose-100 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-400 animate-pulse'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentUploads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No documents found. Please upload.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conflicts Alert Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            System Conflict Alerts
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
            {conflicts.map((conf) => (
              <div 
                key={conf.id} 
                className={`p-4 rounded-lg border text-xs leading-relaxed ${
                  conf.severity === 'high' 
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400' 
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between mb-1">
                  <span>{conf.conflict_type.replace('_', ' ')}</span>
                  <span className="uppercase text-[9px] tracking-wider bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                    {conf.severity}
                  </span>
                </div>
                <p>{conf.description}</p>
                <div className="mt-2 text-[10px] text-black/40 dark:text-white/40 font-mono">
                  Detected: {conf.detected_at}
                </div>
              </div>
            ))}
            {conflicts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center text-zinc-500">
                <p className="text-xs">No active conflicts detected. Operational configurations are compliant.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
