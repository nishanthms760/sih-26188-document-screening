import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon,
  Percent,
  ShieldCheck,
  UserX
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie
} from 'recharts';
import { analyticsService } from '../services/api';
import type { AnalyticsDashboardData } from '../types';

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('7days'); // today, 7days, 30days

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const dashData = await analyticsService.getDashboard();
        setData(dashData);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Compiling analytical intelligence...</p>
      </div>
    );
  }

  const { stats, trend, risk_distribution, document_distribution } = data;

  // Rate calculations
  const total = stats.total_screened || 1; // avoid division by zero
  const validRate = ((stats.valid_count / total) * 100).toFixed(1);
  const suspiciousRate = ((stats.suspicious_count / total) * 100).toFixed(1);
  const highRiskRate = ((stats.high_risk_count / total) * 100).toFixed(1);
  const faceMismatchRate = ((stats.face_failures / total) * 100).toFixed(1);

  const docChartData = [
    { name: 'Passport', value: document_distribution.passport },
    { name: 'Visa', value: document_distribution.visa },
    { name: 'National ID', value: document_distribution.national_id },
    { name: 'Licence', value: document_distribution.driving_licence },
    { name: 'Permit', value: document_distribution.permit },
    { name: 'Other', value: document_distribution.other }
  ];

  const riskChartData = [
    { name: 'Low', value: risk_distribution.low, color: '#10b981' },
    { name: 'Medium', value: risk_distribution.medium, color: '#f59e0b' },
    { name: 'High', value: risk_distribution.high, color: '#f97316' },
    { name: 'Critical', value: risk_distribution.critical, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <BarChart3 className="w-[26px] h-[26px] text-indigo-400" /> SECURE SCREENING ANALYTICS
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Aggregate performance audits, false identity ratios, and threat distributions</p>
        </div>
        {/* Date Filter Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex gap-1 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`py-1.5 px-3 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                dateFilter === tab.id ? 'bg-indigo-600 text-white font-black' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Valid Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <span>Genuine Validation Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-wide">{validRate}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Percentage of documents classified as low risk</p>
          </div>
        </div>

        {/* Suspicious Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <span>Suspicion Verification Rate</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-wide">{suspiciousRate}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Percentage of dossiers flagged as warning anomalies</p>
          </div>
        </div>

        {/* High Risk Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <span>Tampering Anomaly Rate</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-wide">{highRiskRate}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Percentage of files requiring high/critical review</p>
          </div>
        </div>

        {/* Face Mismatch Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <span>Biometric Mismatch Rate</span>
            <UserX className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white tracking-wide">{faceMismatchRate}%</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Percentage of facial verification failures</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend line */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-[18px] h-[18px] text-indigo-400" /> Operations Scanning Logs Volume
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                <Line type="monotone" dataKey="total" name="Total Scans" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="suspicious" name="Suspicious" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="high_risk" name="High Risk" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Risk Severity Ratio</h4>
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} cases`, 'Volume']} contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total scans</span>
              <span className="text-3xl font-black text-white">{stats.total_screened}</span>
            </div>
          </div>
          {/* Detailed legends */}
          <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
            {riskChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="truncate">{item.name}: {((item.value / total)*100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Volumes Bar */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Scan Counts by Document Category</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value} cases`, 'Scans']} contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff', fontSize: 12 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {docChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill="#6366f1" className="hover:fill-indigo-400 transition-colors" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System parameters and latency checks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Latency & Load</h4>
          <div className="space-y-4 text-xs">
            {[
              { label: 'Avg OCR Latency', val: '1.2s', status: 'optimal', color: 'text-emerald-400' },
              { label: 'Avg Forensics Latency', val: '3.4s', status: 'optimal', color: 'text-emerald-400' },
              { label: 'Biometrics cosine check time', val: '0.8s', status: 'optimal', color: 'text-emerald-400' },
              { label: 'Audit hash ledger append time', val: '0.1s', status: 'optimal', color: 'text-emerald-400' }
            ].map((metric, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{metric.label}</span>
                <div className="text-right">
                  <span className="font-bold text-white block font-mono">{metric.val}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${metric.color}`}>{metric.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
