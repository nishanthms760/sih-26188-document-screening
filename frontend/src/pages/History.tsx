import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { screeningService } from '../services/api';
import type { Screening } from '../types';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  const limit = 12;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await screeningService.getHistory({
        search: search || undefined,
        document_type: docType || undefined,
        risk_level: riskLevel || undefined,
        status: status || undefined,
        sort_by: sortBy,
        sort_desc: sortDesc,
        page,
        limit
      });
      setScreenings(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, docType, riskLevel, status, sortBy, sortDesc]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleClearFilters = () => {
    setSearch('');
    setDocType('');
    setRiskLevel('');
    setStatus('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide">SCREENING DOSSIER LOGS</h2>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Browse and audit historical traveler checks database</p>
      </div>

      {/* Search & Filters Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Traveler Name, Screening ID, or Document Number..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button 
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            Search Logs
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[10px]">
            <Filter className="w-3.5 h-3.5" /> Filter Dossiers:
          </div>

          {/* Doc Type Filter */}
          <select 
            value={docType}
            onChange={(e) => { setDocType(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">Document Category (All)</option>
            {['PASSPORT', 'VISA', 'NATIONAL_ID', 'DRIVING_LICENCE', 'PERMIT', 'OTHER'].map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>

          {/* Risk Level Filter */}
          <select 
            value={riskLevel}
            onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">Risk Level (All)</option>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">Verification Status (All)</option>
            {['NEW', 'UNDER_REVIEW', 'ESCALATED', 'CLEARED', 'CLOSED'].map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>

          {/* Sort By Filter */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="created_at">Sort: Created Date</option>
              <option value="risk_score">Sort: Threat Score</option>
              <option value="completed_at">Sort: Completion Date</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDesc(!sortDesc)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:text-white transition-colors cursor-pointer"
            >
              {sortDesc ? 'DESC' : 'ASC'}
            </button>
          </div>

          {/* Clear Button */}
          {(docType || riskLevel || status || search) && (
            <button 
              onClick={handleClearFilters}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest cursor-pointer ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing database registers...</span>
          </div>
        ) : screenings.length === 0 ? (
          <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-2">
            <FileSpreadsheet className="w-12 h-12 text-slate-700" />
            <span className="text-sm font-bold uppercase tracking-widest">No entries found matching filters</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Screening ID</th>
                    <th className="py-3 px-4">Doc Category</th>
                    <th className="py-3 px-4">Traveler Name</th>
                    <th className="py-3 px-4">Document Number</th>
                    <th className="py-3 px-4 text-center">Threat score</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4">Checkpoint Time</th>
                    <th className="py-3 px-4 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {screenings.map((screen) => (
                    <tr key={screen.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white font-mono">{screen.screening_id}</td>
                      <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-400">{screen.document_type}</td>
                      <td className="py-3.5 px-4 font-semibold">{screen.ocr_result?.name || 'In Processing...'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{screen.ocr_result?.document_number || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-sm">{screen.risk_score}/100</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          screen.risk_level === 'LOW' ? 'bg-emerald-500/10 text-emerald-400' :
                          screen.risk_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                          screen.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {screen.risk_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          screen.status === 'CLEARED' ? 'text-emerald-400 bg-emerald-500/5' :
                          screen.status === 'ESCALATED' ? 'text-rose-400 bg-rose-500/5' :
                          screen.status === 'UNDER_REVIEW' ? 'text-amber-400 bg-amber-500/5' :
                          'text-slate-400 bg-slate-500/5'
                        }`}>
                          {screen.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {screen.completed_at ? new Date(screen.completed_at).toLocaleString() : new Date(screen.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/screening/${screen.id}/result`)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                          title="View Intelligence Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center border-t border-slate-800 pt-4 text-xs">
              <span className="text-slate-500">Showing page {page} of listings</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={screenings.length < limit}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded flex items-center gap-1 cursor-pointer transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
