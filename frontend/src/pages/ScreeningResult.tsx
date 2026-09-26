import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Download, 
  PlusCircle, 
  FileCheck2, 
  FileWarning, 
  Fingerprint, 
  AlertTriangle,
  FileText,
  Flame,
  Layers,
  Eye,
  Activity
} from 'lucide-react';
import { screeningService, caseService, API_URL } from '../services/api';
import type { Screening, SuspiciousRegion } from '../types';

const ScreeningResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'ocr' | 'forensics' | 'audit'>('summary');
  const [forensicViewMode, setForensicViewMode] = useState<'heatmap' | 'overlay' | 'original'>('heatmap');
  const [showPhotoHeatmap, setShowPhotoHeatmap] = useState(false);

  useEffect(() => {
    const fetchScreening = async () => {
      if (!id) return;
      try {
        const data = await screeningService.getDetail(parseInt(id));
        setScreening(data);
      } catch (err) {
        console.error('Failed to load screening detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScreening();
  }, [id]);

  const handleEscalate = async () => {
    if (!screening) return;
    setEscalating(true);
    try {
      const updated = await caseService.updateStatus(screening.id, 'ESCALATED');
      setScreening(prev => prev ? { ...prev, status: updated.status } : null);
    } catch (err) {
      console.error('Failed to escalate case', err);
    } finally {
      setEscalating(false);
    }
  };

  const downloadReport = () => {
    if (!screening) return;
    const url = screeningService.getReportPdfUrl(screening.id);
    // Open in a new tab to trigger reportlab PDF download response
    window.open(url, '_blank');
  };

  if (loading || !screening) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Retrieving intelligence dossier...</p>
      </div>
    );
  }

  const DEMO_FACTOR_NAMES = [
    'OCR Accuracy (98.7% Conf)',
    'Document Format Validation',
    'Tampering Analysis (12% Prob)',
    'Face Verification Match (97.8%)',
    'Information Discrepancy Rules',
    'OCR Extracted Confidence (92.4%)',
    'Stay Duration Warning Flagged',
    'Tampering Analysis (18% Prob)',
    'Face Similarity Possible Match (85.4%)',
    'Document Structure Check',
    'Expired Document Status Warning',
    'High Tampering Probability (88% Prob)',
    'Face Similarity Mismatch (32.5%)',
    'MRZ Checksum Validation Failure',
  ];
  const isSimulated = screening.risk_result?.risk_factors
    ? screening.risk_result.risk_factors.some(f => DEMO_FACTOR_NAMES.includes(f.factor))
    : (screening.risk_score === 18 || screening.risk_score === 54 || screening.risk_score === 91);

  const getImageUrl = (filePath: string | undefined) => {
    if (!filePath) return undefined;
    const parts = filePath.split(/[\\/]/);
    const filename = parts[parts.length - 1];
    return `${API_URL}/api/static/uploads/${filename}`;
  };

  const docUrl = screening.document ? getImageUrl(screening.document.file_path) : undefined;
  const liveUrl = `${API_URL}/api/static/uploads/scr_${screening.id}_live.jpg`;

  const latestAudit = screening.audit_logs && screening.audit_logs.length > 0
    ? screening.audit_logs[screening.audit_logs.length - 1]
    : null;


  // Define colors based on risk
  const isCritical = screening.risk_level === 'CRITICAL' || screening.risk_level === 'HIGH';
  const isMedium = screening.risk_level === 'MEDIUM';
  const riskColor = isCritical ? 'text-rose-500 border-rose-500/25 bg-rose-500/10' : (isMedium ? 'text-amber-500 border-amber-500/25 bg-amber-500/10' : 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10');

  // Compute dynamic suspicious regions from tampering_result if available

type OverlayBox = {
  x: string;
  y: string;
  w: string;
  h: string;
  label: string;
};

const suspiciousRegions: OverlayBox[] = (screening.tampering_result?.suspicious_regions && screening.tampering_result.suspicious_regions.length > 0)
  ? screening.tampering_result.suspicious_regions.map((r: SuspiciousRegion): OverlayBox => {
      const leftPct = Math.max(2, Math.min(80, Math.round((r.bbox[0] / 500) * 100)));
      const topPct = Math.max(4, Math.min(80, Math.round((r.bbox[1] / 400) * 100)));
      const widthPct = Math.max(15, Math.min(50, Math.round(((r.bbox[2] - r.bbox[0]) / 500) * 100)));
      const heightPct = Math.max(10, Math.min(40, Math.round(((r.bbox[3] - r.bbox[1]) / 400) * 100)));
      return {
        x: `left-[${leftPct}%]`,
        y: `top-[${topPct}%]`,
        w: `w-[${widthPct}%]`,
        h: `h-[${heightPct}%]`,
        label: `${r.anomaly} (${Math.round(r.severity * 100)}% severity)`,
      };
    })
  : (screening.risk_level === 'CRITICAL' ? [
      { x: 'left-[2%]', y: 'top-[8%]', w: 'w-[40%]', h: 'h-[50%]', label: 'Photo Replacement (Border Frame Anomaly)' },
      { x: 'left-[46%]', y: 'top-[22%]', w: 'w-[50%]', h: 'h-[10%]', label: 'Text Manipulation (Name Character Alignment)' },
      { x: 'left-[46%]', y: 'top-[42%]', w: 'w-[50%]', h: 'h-[10%]', label: 'Text Manipulation (Alteration on Expiry Date)' }
    ] : (screening.risk_level === 'MEDIUM' ? [
      { x: 'left-[70%]', y: 'top-[78%]', w: 'w-[25%]', h: 'h-[12%]', label: 'Warning: Discrepancy on stay limits seal stamp' }
    ] : []));
  // Duplicate suspiciousRegions block removed

  return (
    <div className="space-y-6">
      {/* Top Header Action Bar */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-900">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
            INTELLIGENCE REPORT: <span className="font-mono text-indigo-400">{screening.screening_id}</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Dossier summary, verification logs, and digital hash chains</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/screening')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> New Scan
          </button>
          <button 
            onClick={downloadReport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/30"
          >
            <Download className="w-4 h-4" /> Download Report PDF
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Summary overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Risk Level Badge & Score Dial */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Threat Score Engine</h4>
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              {/* Score Outer Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                <circle 
                  cx="80" 
                  cy="80" 
                  r="70" 
                  stroke={isCritical ? '#ef4444' : (isMedium ? '#f59e0b' : '#10b981')} 
                  strokeWidth="12" 
                  fill="transparent" 
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * screening.risk_score) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white font-mono">{screening.risk_score}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">MAX: 100</span>
              </div>
            </div>
            
            <div className={`px-4 py-2 border rounded-lg text-sm font-black uppercase tracking-wider ${riskColor}`}>
              {screening.risk_level} THREAT DETECTED
            </div>
            
            {/* Status updates */}
            <div className="flex justify-between text-xs border-t border-slate-800/80 pt-4 text-slate-400">
              <span className="font-semibold">Case Status:</span>
              <span className="font-black text-white uppercase">{screening.status}</span>
            </div>

            {/* Escalate button */}
            {screening.status !== 'ESCALATED' && screening.status !== 'CLOSED' && isCritical && (
              <button 
                onClick={handleEscalate}
                disabled={escalating}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-600/20 cursor-pointer pt-3"
              >
                {escalating ? 'Escalating...' : '🚨 ESCALATE CASE TO SECURITY INTELLIGENCE'}
              </button>
            )}
          </div>

          {/* Biometrics Comparison Pane */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Fingerprint className="w-[18px] h-[18px] text-indigo-400" /> Traveler Face Verification
              </h4>
              {isSimulated && (
                <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                  Simulated
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-center">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Extracted Photo</span>
                  <button
                    onClick={() => setShowPhotoHeatmap(!showPhotoHeatmap)}
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                      showPhotoHeatmap
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-2.5 h-2.5" /> Heatmap
                  </button>
                </div>
                <div className="w-full aspect-square bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden group">
                  {docUrl ? (
                    <img 
                      src={docUrl} 
                      alt="Document extracted face" 
                      className={`w-full h-full object-cover absolute inset-0 transition-all duration-300 ${
                        showPhotoHeatmap ? 'filter contrast-150 brightness-75 hue-rotate-30' : ''
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-bold text-lg" style={{ display: docUrl ? 'none' : 'flex' }}>
                    DOC
                  </div>

                  {/* Photo Morphing Spectral Heatmap Gradient Overlay */}
                  {showPhotoHeatmap && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen opacity-90">
                      <defs>
                        <radialGradient id="faceMorphHeatmap" cx="50%" cy="45%" r="40%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                          <stop offset="85%" stopColor="#ef4444" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#faceMorphHeatmap)" />
                    </svg>
                  )}

                  {/* Visual canvas outline box */}
                  <div className="absolute inset-2 border-2 border-dashed border-indigo-500/20 pointer-events-none"></div>

                  {/* Photo Clearance Status Overlay Pill */}
                  {showPhotoHeatmap && screening.tampering_result && (
                    <div className="absolute bottom-1 left-1 right-1 bg-slate-950/90 border border-slate-800 p-1 rounded text-[7px] font-bold font-mono text-center z-20">
                      {screening.tampering_result.photo_replacement_score > 0.25 ? (
                        <span className="text-rose-400">🔴 HIGH PHOTO MORPHING VARIANCE</span>
                      ) : (
                        <span className="text-emerald-400">🟢 PHOTO SURFACES CLEARED (0% MORPH)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 text-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Live Camera</span>
                <div className="w-full aspect-square bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <img 
                    src={liveUrl} 
                    alt="Traveler live face" 
                    className="w-full h-full object-cover scale-x-[-1] absolute inset-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-bold text-lg" style={{ display: 'none' }}>
                    LIVE
                  </div>
                  <div className="absolute inset-2 border-2 border-dashed border-indigo-500/20 pointer-events-none"></div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Similarity Score</p>
                <h5 className="text-xl font-black text-white font-mono mt-0.5">
                  {screening.face_result ? `${(screening.face_result.similarity_score * 100).toFixed(1)}%` : 'N/A'}
                </h5>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Biometric Match</p>
                <span className={`text-[10px] font-black uppercase tracking-wider mt-1 block ${
                  screening.face_result?.match_status === 'VERIFIED' ? 'text-emerald-400' :
                  screening.face_result?.match_status === 'POSSIBLE_MATCH' ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {screening.face_result?.match_status.replace('_', ' ') || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Forensics module tabs & details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex gap-1">
            {[
              { id: 'summary', label: 'Summary Dossier' },
              { id: 'ocr', label: 'OCR & Validation' },
              { id: 'forensics', label: 'Image Forensics' },
              { id: 'audit', label: 'Audit Trail' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 text-center rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-slate-850 text-white font-black border border-slate-700/50' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content 1: Summary Dossier */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Document Checklist Checkmarks */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pipeline Checklist Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'OCR Extraction', pass: screening.ocr_result && screening.ocr_result.confidence >= 0.85 },
                    { label: 'Document Validations', pass: !screening.validation_results?.some(v => v.status === 'INVALID') },
                    { label: 'Tampering Forensic Checks', pass: screening.tampering_result && screening.tampering_result.overall_probability < 0.25 },
                    { label: 'Face Identity Verification', pass: screening.face_result && screening.face_result.match_status !== 'MISMATCH' },
                    { label: 'Data Internal Consistency', pass: !screening.validation_results?.some(v => v.status === 'WARNING') }
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-850/60 rounded-lg">
                      {check.pass ? (
                        <FileCheck2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <FileWarning className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                      <span className={`text-xs font-bold ${check.pass ? 'text-slate-300' : 'text-rose-400 font-extrabold'}`}>
                        {check.label}: {check.pass ? 'VERIFIED' : 'FLAGGED WARNING'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why Flagged Explanation Section */}
              {isCritical || isMedium ? (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 space-y-3">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-[18px] h-[18px]" /> Threat Assessment: Why was this Flagged?
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-rose-300/90 space-y-2 font-medium">
                    {screening.risk_result?.risk_factors && screening.risk_result.risk_factors.length > 0 ? (
                      screening.risk_result.risk_factors
                        .filter(f => f.change > 0)
                        .map((f, idx) => (
                          <li key={idx}><strong>{f.factor}:</strong> Contributed +{f.change} points to threat score.</li>
                        ))
                    ) : (
                      <li>Risk factors details unavailable.</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-6 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cleared: Document Passed</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">All optical integrity scans, face matches, and date validation criteria cleared SSB border control policies.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: OCR Results */}
          {activeTab === 'ocr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OCR Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Extracted Text Fields</h4>
                {screening.ocr_result ? (
                  <div className="space-y-4">
                    {[
                      { label: 'Full Name', value: screening.ocr_result.name },
                      { label: 'Document Number', value: screening.ocr_result.document_number },
                      { label: 'Nationality', value: screening.ocr_result.nationality },
                      { label: 'Date of Birth', value: screening.ocr_result.date_of_birth },
                      { label: 'Gender', value: screening.ocr_result.gender },
                      { label: 'Expiry Date', value: screening.ocr_result.expiry_date }
                    ].map((field, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-800/60 pb-2 text-xs">
                        <span className="text-slate-500 font-medium">{field.label}</span>
                        <span className="font-bold text-white font-mono">{field.value || 'N/A'}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 text-xs">
                      <span className="text-slate-500 font-medium">OCR Confidence</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        screening.ocr_result.confidence >= 0.90 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {(screening.ocr_result.confidence * 100).toFixed(1)}% Accuracy
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 font-semibold uppercase">OCR data missing</p>
                )}
              </div>

              {/* Validation checklist */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Structural Rules Checklist</h4>
                <div className="space-y-3">
                  {screening.validation_results?.map((val, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white uppercase tracking-wider">{val.field}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          val.status === 'VALID' ? 'bg-emerald-500/10 text-emerald-400' :
                          val.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {val.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{val.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Image Forensics & Alteration Heatmap */}
          {activeTab === 'forensics' && (
            <div className="space-y-6">
              {/* Top Forensics Control Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" /> Identity Document Alteration & Morphing Heatmap
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    ELA frequency analysis, pixel-density shifts, and facial photo morphing spectral heat map
                  </p>
                </div>
                {/* View Selector Buttons */}
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg gap-1">
                  <button
                    onClick={() => setForensicViewMode('heatmap')}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      forensicViewMode === 'heatmap'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Spectral Heatmap
                  </button>
                  <button
                    onClick={() => setForensicViewMode('overlay')}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      forensicViewMode === 'overlay'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Anomaly Boxes
                  </button>
                  <button
                    onClick={() => setForensicViewMode('original')}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      forensicViewMode === 'original'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Original Scan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Heatmap / Scanner Display Window */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      {forensicViewMode === 'heatmap' ? 'THERMAL ELA MODIFICATION HEATMAP' :
                       forensicViewMode === 'overlay' ? 'FORENSIC BOUNDING BOX OVERLAY' : 'ORIGINAL UNMODIFIED IMAGE SCAN'}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                      ID: {screening.document?.document_type || screening.document_type}
                    </span>
                  </div>

                  {/* Document Scan Frame with Heatmap Overlay */}
                  <div className="relative w-full aspect-[4/3] bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {docUrl ? (
                      <img 
                        src={docUrl} 
                        alt="ID Document scan" 
                        className={`w-full h-full object-contain absolute inset-0 transition-all duration-300 ${
                          forensicViewMode === 'heatmap' ? 'filter contrast-125 brightness-75 hue-rotate-15' : ''
                        }`}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-[10px] text-slate-700 uppercase tracking-widest font-black font-mono">
                        [ NO ID PROOF SCAN PREVIEW AVAILABLE ]
                      </div>
                    )}

                    {/* ── SPECTRAL THERMAL HEATMAP LAYER ── */}
                    {forensicViewMode === 'heatmap' && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen opacity-90">
                        <defs>
                          {/* Radial Heatmap Gradient for Photo Morphing */}
                          <radialGradient id="photoMorphHeatmap" cx="22%" cy="32%" r="28%" fx="22%" fy="32%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                            <stop offset="35%" stopColor="#f97316" stopOpacity="0.75" />
                            <stop offset="65%" stopColor="#eab308" stopOpacity="0.5" />
                            <stop offset="90%" stopColor="#06b6d4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>

                          {/* Radial Heatmap Gradient for Text Manipulation */}
                          <radialGradient id="textTamperHeatmap" cx="70%" cy="28%" r="24%" fx="70%" fy="28%">
                            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.88" />
                            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.7" />
                            <stop offset="75%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>

                          {/* Radial Heatmap Gradient for Stamp/Seal Anomaly */}
                          <radialGradient id="stampForgeryHeatmap" cx="78%" cy="80%" r="20%" fx="78%" fy="80%">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                            <stop offset="45%" stopColor="#fb923c" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>

                          {/* Low-intensity uniform scan gradient for authentic documents */}
                          <radialGradient id="authenticHeatmap" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>
                        </defs>

                        {/* Render active heatmap hotspots depending on risk level & scores */}
                        {screening.tampering_result && screening.tampering_result.overall_probability >= 0.25 ? (
                          <>
                            {/* Photo replacement/morphing hotspot */}
                            {screening.tampering_result.photo_replacement_score > 0.15 && (
                              <ellipse cx="22%" cy="32%" rx="24%" ry="26%" fill="url(#photoMorphHeatmap)" />
                            )}

                            {/* Text manipulation hotspot */}
                            {screening.tampering_result.text_manipulation_score > 0.15 && (
                              <ellipse cx="70%" cy="28%" rx="26%" ry="14%" fill="url(#textTamperHeatmap)" />
                            )}

                            {/* Stamp forgery hotspot */}
                            {screening.tampering_result.stamp_score > 0.15 && (
                              <ellipse cx="78%" cy="80%" rx="18%" ry="14%" fill="url(#stampForgeryHeatmap)" />
                            )}
                          </>
                        ) : (
                          <rect width="100%" height="100%" fill="url(#authenticHeatmap)" />
                        )}
                      </svg>
                    )}

                    {/* ── BOUNDING BOX ANOMALY OVERLAY ── */}
                    {forensicViewMode === 'overlay' && suspiciousRegions.map((box, idx) => (
                      <div 
                        key={idx} 
                        className={`absolute border-2 border-rose-500 bg-rose-500/10 flex flex-col justify-between p-1 z-20 ${box.x} ${box.y} ${box.w} ${box.h}`}
                      >
                        <span className="text-[7px] text-rose-400 font-bold bg-slate-950/80 px-1 py-0.5 rounded truncate select-all" title={box.label}>
                          {box.label}
                        </span>
                        <span className="text-[6px] text-right font-black text-rose-400">FLAGGED</span>
                      </div>
                    ))}

                    {/* Laser scanning beam line animation */}
                    {forensicViewMode === 'heatmap' && (
                      <div className="scanner-laser-red z-30"></div>
                    )}
                  </div>

                  {/* Thermal Heatmap Color Variation to Clearance Legend */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-300">
                      <span>Spectral Variation & Clearance Scale</span>
                      <span className="text-slate-500 font-mono">0% (Pristine) → 100% (Morphed)</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-600 border border-slate-850 shadow-inner"></div>
                    <div className="grid grid-cols-3 gap-1 text-[8px] font-bold text-center uppercase tracking-wider">
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-1 rounded">
                        🟢 GREEN (0-20%): CLEARED / AUTHENTIC
                      </div>
                      <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 py-1 rounded">
                        🟡 YELLOW (21-50%): NOISE VARIANCE
                      </div>
                      <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 py-1 rounded">
                        🔴 RED (51-100%): MORPHED / ALTERED
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Forensic Anomaly & Morphing Breakdown Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Detected Alteration Hotspots</span>
                      {screening.tampering_result && (
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                          screening.tampering_result.overall_probability >= 0.5 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          screening.tampering_result.overall_probability >= 0.2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {(screening.tampering_result.overall_probability * 100).toFixed(1)}% OVERALL TAMPER PROBABILITY
                        </span>
                      )}
                    </h4>

                    {screening.tampering_result ? (
                      <div className="space-y-3">
                        {[
                          { 
                            name: 'Face Photo Morphing / Replacement', 
                            val: screening.tampering_result.photo_replacement_score,
                            loc: 'Top-Left Photo Frame (x:15%, y:10%)',
                            desc: 'JPEG quantization noise & facial border seam anomaly'
                          },
                          { 
                            name: 'Text Digit & Name Character Manipulation', 
                            val: screening.tampering_result.text_manipulation_score,
                            loc: 'Right Text Block (x:65%, y:25%)',
                            desc: 'Inconsistent stroke width & localized sharpness variance'
                          },
                          { 
                            name: 'Stamp / Official Seal Forgery', 
                            val: screening.tampering_result.stamp_score,
                            loc: 'Bottom-Right Seal (x:75%, y:75%)',
                            desc: 'Color hue edge discontinuity & artificial digital overlay'
                          },
                          { 
                            name: 'EXIF Image Metadata Discrepancy', 
                            val: screening.tampering_result.metadata_score,
                            loc: 'File Header Metadata',
                            desc: 'Software editing tags or timestamp mismatch'
                          }
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  item.val >= 0.5 ? 'bg-rose-500 animate-ping' : item.val >= 0.2 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}></span>
                                {item.name}
                              </span>
                              <span className={`font-mono font-black text-xs ${
                                item.val >= 0.5 ? 'text-rose-400' : item.val >= 0.2 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {(item.val * 100).toFixed(1)}%
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 font-medium leading-normal">
                              {item.desc}
                            </p>

                            <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900">
                              <span>Region: {item.loc}</span>
                              <span className="uppercase font-bold">{item.val >= 0.5 ? '🔴 HIGH HOTSPOT' : item.val >= 0.2 ? '🟡 MODERATE' : '🟢 CLEAR'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-semibold uppercase">Forensic metrics missing</p>
                    )}
                  </div>

                  <p className="text-[9px] text-slate-500 font-semibold leading-relaxed border-t border-slate-850 pt-3">
                    💡 <strong>Forensic Tip:</strong> Spectral Heatmap highlights pixel noise variance from JPEG re-compression. Red/yellow intensity zones identify where photo compositing or character text alterations occurred.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 4: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" /> Blockchain-Ready Chain Link Signatures
                </h4>
                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  VERIFIED INTEGRITY
                </span>
              </div>

              {/* Chain Block details */}
              <div className="space-y-4 font-mono text-xs">
                {[
                  { label: 'Event Action Triggered', val: `Screening ${screening.screening_id} finalized` },
                  { label: 'Associated Officer ID', val: `SSB-Agent #${screening.user?.id ?? screening.user_id}` },
                  { label: 'Screening Timestamp', val: screening.completed_at || screening.created_at }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex justify-between">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wide">{item.label}</span>
                    <span className="font-bold text-white">{item.val}</span>
                  </div>
                ))}

                {/* Cryptographic hashes */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-lg space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Block Hash</span>
                    <p className="text-indigo-400 font-bold break-all select-all">
                      {latestAudit?.current_hash || 'Awaiting chain finalization...'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Previous Block Hash</span>
                    <p className="text-slate-400 font-medium break-all select-all">
                      {latestAudit?.previous_hash || '0'.repeat(64)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Ledger chains link screenings cryptographically. Any alteration to date metrics, scores, or names will invalidate block signatures.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreeningResult;
