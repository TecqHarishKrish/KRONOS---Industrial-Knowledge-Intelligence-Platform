import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { 
  FileText, 
  Cpu, 
  AlertTriangle, 
  Clock, 
  AlertOctagon,
  Activity,
  ShieldAlert,
  Download,
  TrendingUp
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
  
  const [healthScore, setHealthScore] = useState<number>(85);
  const [healthMetrics, setHealthMetrics] = useState<any>({});
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [execData, setExecData] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, healthRes, alertsRes, execRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/health'),
          api.get('/analytics/alerts'),
          api.get('/analytics/executive')
        ]);

        setSummary(dashRes.data.summary);
        setRecentUploads(dashRes.data.recent_uploads);
        setConflicts(dashRes.data.conflicts);
        setCategoryData(dashRes.data.category_distribution);
        setTrendData(dashRes.data.equipment_trends);

        setHealthScore(healthRes.data.global_score);
        setHealthMetrics(healthRes.data.metrics);
        setRecommendations(healthRes.data.recommendations);

        setPredictiveAlerts(alertsRes.data);
        setExecData(execRes.data);
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

  // Generate executive report PDF download
  const handleExportExecutiveReport = () => {
    if (!execData) return;
    const reportText = (
      `# KRONOS INDUSTRIAL MEMORY OS — EXECUTIVE WEEKLY REPORT\n` +
      `Compliance Score: ${execData.compliance_score}%\n` +
      `Global Knowledge Health: ${healthScore}%\n` +
      `Critical Components: ${execData.critical_equipment.join(', ') || 'None'}\n\n` +
      `## Weekly Risk Summary\n` +
      `${execData.weekly_summary}\n\n` +
      `## AI Optimization Recommendations\n` +
      `${execData.ai_recommendation}\n`
    );
    const element = document.createElement("a");
    const file = new Blob([reportText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "Kronos_Executive_Risk_Report.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Executive Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Analytics Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Industrial knowledge graphs, health compliance checks, and operational safety metrics.
          </p>
        </div>
        <button
          onClick={handleExportExecutiveReport}
          disabled={!execData}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <Download size={16} /> Export Exec Report
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Knowledge Health Score */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Knowledge Health</span>
            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{healthScore}%</h3>
            {healthMetrics.documentation_coverage !== undefined && (
              <p className="text-[10px] text-zinc-400 mt-1">Cover: {healthMetrics.documentation_coverage}% | Meta: {healthMetrics.metadata_completeness}%</p>
            )}
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-blue-600 dark:text-blue-400">
            <Activity size={24} />
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Documents</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_documents}</h3>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-zinc-600 dark:text-zinc-400">
            <FileText size={24} />
          </div>
        </div>

        {/* Total Equipment */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tracked Twins</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_equipment}</h3>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Cpu size={24} />
          </div>
        </div>

        {/* Total Incidents */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Incidents</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_incidents}</h3>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-amber-600 dark:text-amber-400">
            <Clock size={24} />
          </div>
        </div>

        {/* Active Conflicts */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Conflicts</span>
            <h3 className="text-3xl font-bold text-zinc-950 dark:text-zinc-50 mt-1">{summary.total_conflicts}</h3>
          </div>
          <div className={`p-3 rounded-lg ${summary.total_conflicts > 0 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}>
            <AlertOctagon size={24} />
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Executive Insights & Predictive operational warnings */}
      {execData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Executive Overview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-100 md:col-span-1 shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={16} /> Compliance Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{execData.compliance_score}%</span>
                <span className="text-xs text-zinc-400">regulatory alignment</span>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase font-semibold">Critical Equipment</p>
                <p className="text-sm text-zinc-200 font-medium mt-1">
                  {execData.critical_equipment.join(', ') || 'All components compliant'}
                </p>
              </div>
              <div className="text-xs text-zinc-400 border-t border-zinc-800 pt-3 space-y-1">
                <span className="font-bold text-zinc-300">Remediations:</span>
                {recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="truncate">• {rec}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Predictive Warnings list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4 flex items-center gap-2">
              <ShieldAlert className="text-amber-500" size={18} /> Predictive Operational Risk Alerts
            </h3>
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {predictiveAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 text-xs p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      alert.severity === 'high' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {alert.type}
                    </span>
                    <p className="text-zinc-700 dark:text-zinc-300 mt-2 font-medium">{alert.description}</p>
                  </div>
                  <span className="font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Conf: {Math.round(alert.confidence * 100)}%
                  </span>
                </div>
              ))}
              {predictiveAlerts.length === 0 && (
                <p className="text-zinc-500 text-xs py-10 text-center">No predictive configuration alerts.</p>
              )}
            </div>
          </div>
        </div>
      )}

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
