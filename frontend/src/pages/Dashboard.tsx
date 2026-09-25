import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck2, 
  FileWarning, 
  ShieldAlert, 
  Clock, 
  UserX, 
  Eye, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { analyticsService, screeningService } from '../services/api';
import type { AnalyticsDashboardData, Screening } from '../types';

// Simple vector Lucide plugin fallback
const PlusCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [recentScreenings, setRecentScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashData, historyData] = await Promise.all([
          analyticsService.getDashboard(),
          screeningService.getHistory({ limit: 5 })
        ]);
        setData(dashData);
        setRecentScreenings(historyData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-bold tracking-wide uppercase">Initializing Intelligence Dashboard...</p>
      </div>
    );
  }

  const { stats, trend, risk_distribution, document_distribution } = data;

  // Formatting data for Recharts Donut
  const riskChartData = [
    { name: 'Low Risk', value: risk_distribution.low, color: '#10b981' },
    { name: 'Medium Risk', value: risk_distribution.medium, color: '#f59e0b' },
    { name: 'High Risk', value: risk_distribution.high, color: '#f97316' },
    { name: 'Critical Risk', value: risk_distribution.critical, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Formatting data for Recharts Bar
  const docChartData = [
    { name: 'Passport', value: document_distribution.passport },
    { name: 'Visa', value: document_distribution.visa },
    { name: 'National ID', value: document_distribution.national_id },
    { name: 'Licence', value: document_distribution.driving_licence },
    { name: 'Permit', value: document_distribution.permit },
    { name: 'Other', value: document_distribution.other }
  ];

  const statCards = [
    { title: 'Total Screened', value: stats.total_screened, icon: FileSpreadsheet, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { title: 'Valid Documents', value: stats.valid_count, icon: FileCheck2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Suspicious Cases', value: stats.suspicious_count, icon: FileWarning, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'High-Risk Cases', value: stats.high_risk_count, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'Avg Process Time', value: `${stats.avg_screening_time}s`, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Biometric Mismatch', value: stats.face_failures, icon: UserX, color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">SSB SECURITY COMMAND CENTER</h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Border Screening Analytics & Threat Assessment</p>
        </div>
        <button 
          onClick={() => navigate('/screening')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusCircleIcon className="w-4 h-4" /> Start New Screening
        </button>
      </div>

      {/* Stats Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover-card">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.title}</p>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mt-3 tracking-wide">{card.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Recharts Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart - Screening Trend */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Screening Operations Trend (Last 7 Days)</h4>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="total" name="Total Scans" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="suspicious" name="Suspicious" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="high_risk" name="High Risk" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart - Risk Level Split */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Risk Distribution</h4>
          <div className="h-60 relative flex items-center justify-center">
            {riskChartData.length === 0 ? (
              <p className="text-slate-500 text-xs font-bold uppercase">No data recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} cases`, 'Volume']} contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Cases</span>
              <span className="text-2xl font-black text-white">{stats.total_screened}</span>
            </div>
          </div>
          {/* Legend indicators */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {riskChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Doc Type Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Document Category Volumes</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value} docs`, 'Scans']} contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {docChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill="#6366f1" className="hover:fill-indigo-400 transition-colors" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Screenings Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Live Checkpoint Scans Log</h4>
            <button 
              onClick={() => navigate('/history')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-wider cursor-pointer"
            >
              Full History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Screening ID</th>
                  <th className="py-2.5 px-3">Doc Type</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3 text-center">Risk Score</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentScreenings.map((screen) => (
                  <tr key={screen.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-white font-mono">{screen.screening_id}</td>
                    <td className="py-3 px-3 uppercase text-[10px] font-semibold text-slate-400">{screen.document_type}</td>
                    <td className="py-3 px-3 font-medium">{screen.ocr_result?.name || 'In Processing...'}</td>
                    <td className="py-3 px-3 text-center font-bold font-mono">{screen.risk_score}/100</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        screen.risk_level === 'LOW' ? 'bg-emerald-500/10 text-emerald-400' :
                        screen.risk_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                        screen.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {screen.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        screen.status === 'CLEARED' ? 'text-emerald-400 bg-emerald-500/5' :
                        screen.status === 'ESCALATED' ? 'text-rose-400 bg-rose-500/5' :
                        screen.status === 'UNDER_REVIEW' ? 'text-amber-400 bg-amber-500/5' :
                        'text-slate-400 bg-slate-500/5'
                      }`}>
                        {screen.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button 
                        onClick={() => navigate(`/screening/${screen.id}/result`)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                        title="View Detailed Intelligence"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
