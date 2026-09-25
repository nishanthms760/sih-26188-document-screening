import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Eye, 
  CheckCircle, 
  XOctagon, 
  FolderOpen,
  UserCheck
} from 'lucide-react';
import { caseService } from '../services/api';
import type { Screening } from '../types';

const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await caseService.getCases();
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await caseService.updateStatus(id, status);
      // Reload cases queue
      await fetchCases();
    } catch (err) {
      console.error('Failed to update case status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
          <AlertTriangle className="w-[26px] h-[26px] text-rose-500 animate-pulse" /> HIGH-RISK INCIDENT QUEUE
        </h2>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Manage and resolve flagged identity anomalies and border escalations</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing operations queue...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
          <span className="text-sm font-bold uppercase tracking-widest text-slate-300">Incident Queue Empty</span>
          <p className="text-[10px] text-slate-500 max-w-sm mt-1">All scanned travelers and documents are compliant with current border control filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => {
            const isCrit = c.risk_level === 'CRITICAL' || c.risk_level === 'HIGH';
            const statusBadgeColor = 
              c.status === 'CLEARED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              c.status === 'UNDER_REVIEW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              c.status === 'CLOSED' ? 'bg-slate-800 text-slate-400 border-slate-700/50' :
              'bg-rose-500/10 text-rose-400 border-rose-500/20';

            return (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover-card">
                <div className="space-y-4">
                  {/* Card Header: Case ID & Status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-black text-white font-mono">{c.screening_id}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{c.document_type} Scan</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${statusBadgeColor}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Threat Score & Risk level indicator */}
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Threat Score</span>
                      <h5 className="text-xl font-black text-white font-mono mt-0.5">{c.risk_score}/100</h5>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      isCrit ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {c.risk_level}
                    </span>
                  </div>

                  {/* Flagged Reasons list */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Anomaly Summary</span>
                    <ul className="text-[10px] text-slate-400 space-y-1 list-disc pl-4 leading-normal">
                      {c.risk_score >= 88 ? (
                        <>
                          <li>Document has EXPIRED (2020)</li>
                          <li>Forensic ELA photo replacement match (85%)</li>
                          <li>Traveler face similarity mismatch (32.5%)</li>
                        </>
                      ) : (
                        <>
                          <li>Visa Authorized Stay Limit warning</li>
                          <li>Face similarity in Warning threshold (85.4%)</li>
                          <li>Text overlay character alignment anomaly</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Bottom Actions buttons */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/screening/${c.id}/result`)}
                      className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded border border-slate-800 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      title="Inspect Forensics Dossier"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Case
                    </button>
                    {c.status !== 'UNDER_REVIEW' && c.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleStatusChange(c.id, 'UNDER_REVIEW')}
                        disabled={updatingId === c.id}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Review
                      </button>
                    )}
                  </div>

                  {/* Close/Clear resolution */}
                  <div className="flex gap-2">
                    {c.status !== 'CLEARED' && c.status !== 'CLOSED' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(c.id, 'CLEARED')}
                          disabled={updatingId === c.id}
                          className="flex-1 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Clear Case
                        </button>
                        <button
                          onClick={() => handleStatusChange(c.id, 'CLOSED')}
                          disabled={updatingId === c.id}
                          className="flex-1 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <XOctagon className="w-3.5 h-3.5" /> Close Denied
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CasesPage;
