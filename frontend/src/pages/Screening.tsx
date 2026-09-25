import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  File,
  X,
  Cpu,
  CheckCircle2,
  Loader2,
  UserSquare2,
  FileText,
  AlertCircle,
  HelpCircle,
  Camera,
  RotateCcw
} from 'lucide-react';
import { screeningService } from '../services/api';

const ScreeningPage: React.FC = () => {
  const navigate = useNavigate();

  const [docType, setDocType] = useState('PASSPORT');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [liveFile, setLiveFile] = useState<File | null>(null);
  const [scenario, setScenario] = useState('genuine');
  const [_uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Pipeline loading states
  const [currentStep, setCurrentStep] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const pipelineSteps = [
    { title: 'Document Scanned', desc: 'SHA-256 integrity hash verification' },
    { title: 'OCR Extraction', desc: 'Character optical recognition and reading' },
    { title: 'Document Validation', desc: 'Expiries, patterns, and MRZ consistency checks' },
    { title: 'Tampering Detection', desc: 'ELA forensics, noise profiles, stamp checks' },
    { title: 'Face Verification', desc: 'Traveler photo similarity mapping' },
    { title: 'Risk Assessment', desc: 'Weighted risk scores calculations' },
    { title: 'Audit Trail chain Block', desc: 'Appending record log hashes' }
  ];

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setError('Document exceeds 5MB size limit.');
        return;
      }

      setDocFile(file);
      setError('');
    }
  };

  // =========================
  // WEBCAM FUNCTIONS
  // =========================

  const startCamera = async () => {
  try {
    setError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Your browser does not support webcam access.');
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    setCameraStream(stream);
    setCameraOn(true);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  } catch (err: any) {
    console.error('Camera error:', err);

    if (err?.name === 'NotAllowedError') {
      setError(
        'Camera permission was denied. Please allow camera access in your browser.'
      );
    } else if (err?.name === 'NotFoundError') {
      setError('No camera was found on this device.');
    } else if (err?.name === 'NotReadableError') {
      setError('The camera is already being used by another application.');
    } else {
      setError('Unable to access the camera.');
    }

    setCameraOn(false);
  }
};

const stopCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setCameraStream(null);
  setCameraOn(false);
};

const captureLivePhoto = () => {
  if (!videoRef.current || !canvasRef.current) {
    setError('Camera is not ready.');
    return;
  }

  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video.videoWidth || !video.videoHeight) {
    setError('Camera is still loading. Please wait.');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    setError('Unable to capture camera image.');
    return;
  }

  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.restore();

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setError('Failed to capture live photo.');
        return;
      }

      const capturedFile = new globalThis.File(
        [blob],
        'traveler-live-face.jpg',
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );

      setLiveFile(capturedFile);
      setError('');
      stopCamera();
    },
    'image/jpeg',
    0.92
  );
};

const retakePhoto = () => {
  setLiveFile(null);
  setError('');
  startCamera();
};
  // =========================
  // START ANALYSIS
  // =========================

  const startAnalysis = async () => {
    if (!docFile) {
      setError('Please upload a document to proceed.');
      return;
    }

    if (!liveFile) {
      setError('Please capture the traveler live photo to proceed.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setUploadProgress(10);
    setLogMessages(['[SYSTEM] Initializing checkpoint scan...']);

    let screeningId = 0;

    try {
      const screening = await screeningService.create(docType);

      screeningId = screening.id;

      setUploadProgress(30);

      setLogMessages(prev => [
        ...prev,
        `[INFO] Screening record created: ${screening.screening_id}`
      ]);

      setLogMessages(prev => [
        ...prev,
        `[INFO] Uploading document scan...`
      ]);

      await screeningService.uploadDoc(screeningId, docFile);

      setUploadProgress(70);

      setLogMessages(prev => [
        ...prev,
        `[INFO] Document uploaded. File SHA-256 registered.`
      ]);

      setUploadProgress(100);

      setLogMessages(prev => [
        ...prev,
        `[INFO] Invoking AI Core Analysis Pipeline...`
      ]);

      await runLogsAndBackend(screeningId);

    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        'An error occurred during screening processing.'
      );

      setIsProcessing(false);
    }
  };

  const runLogsAndBackend = async (screeningId: number) => {
    const logs = [
      '[OCR] Launching OCR neural networks. Target: ' + docType,
      '[OCR] Text fields found. Extrinsic reading confidence: ' +
        (scenario === 'genuine'
          ? '98%'
          : scenario === 'suspicious'
            ? '92%'
            : '74%'),

      '[VAL] Checking date patterns. Parsing MRZ codes...',

      scenario === 'fake'
        ? '[VAL] WARNING: MRZ checksum validation failed!'
        : '[VAL] Document structure formats validated.',

      '[TAMPER] Running Error Level Analysis (ELA) on photo borders...',

      scenario === 'fake'
        ? '[TAMPER] FORENSICS ALERT: Potential photo replacement overlays detected!'
        : '[TAMPER] Forensic noise checks cleared.',

      '[FACE] Mapping face embeddings. Normalizing live camera frame...',
      '[FACE] Computing cosine similarity metrics...',
      '[RISK] Aggregating weighted criteria scores...',
      '[AUDIT] Assembling ledger block. Accessing previous block hash...',
      '[AUDIT] SHA-256 chain log finalized.'
    ];

    const pipelinePromise = screeningService.runFullPipeline(
      screeningId,
      scenario,
      liveFile || undefined
    );

    for (let i = 0; i < pipelineSteps.length; i++) {
      setCurrentStep(i);

      setLogMessages(prev => [
        ...prev,
        logs[i * 2] || `[SYSTEM] Processing step ${i}...`
      ]);

      if (logs[i * 2 + 1]) {
        await new Promise(r => setTimeout(r, 400));

        setLogMessages(prev => [
          ...prev,
          logs[i * 2 + 1]
        ]);
      }

      await new Promise(r => setTimeout(r, 600));
    }

    const finalizedScreening = await pipelinePromise;

    setLogMessages(prev => [
      ...prev,
      `[SYSTEM] Analysis complete. Redirecting to intelligence report.`
    ]);

    await new Promise(r => setTimeout(r, 500));

    navigate(`/screening/${finalizedScreening.id}/result`);
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide">
          NEW BORDER SCREENING
        </h2>

        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
          Secure Document Scan & Biometric Verification Pipeline
        </p>
      </div>

      {isProcessing ? (

        /* =========================
           PROCESSING SCREEN
           ========================= */

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6">

            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              AI Core Pipeline Active
            </h4>

            <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">

              {pipelineSteps.map((step, idx) => {

                const isPassed = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={idx} className="relative">

                    <span
                      className={`absolute -left-9.5 top-0.5 w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                        isPassed
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : isCurrent
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 animate-pulse'
                            : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {idx + 1}
                        </span>
                      )}
                    </span>

                    <div>

                      <h5
                        className={`text-xs font-bold uppercase tracking-wide ${
                          isCurrent
                            ? 'text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </h5>

                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {step.desc}
                      </p>

                    </div>

                  </div>
                );
              })}

            </div>

          </div>

          {/* Console */}

          <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-xl p-6 flex flex-col h-[480px]">

            <div className="flex justify-between items-center pb-3 border-b border-slate-900">

              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-500" />
                Forensics Console Output
              </span>

              <span className="text-[10px] text-indigo-400 font-bold font-mono">
                STATUS: SCANNING...
              </span>

            </div>

            <div className="flex-1 overflow-y-auto font-mono text-xs text-emerald-400 space-y-2 py-4 select-text">

              {logMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={
                    msg.includes('ALERT')
                      ? 'text-rose-400 font-bold'
                      : msg.includes('WARNING')
                        ? 'text-amber-400'
                        : 'text-emerald-400/90'
                  }
                >
                  {msg}
                </div>
              ))}

              <div className="w-1.5 h-4 bg-emerald-400 animate-pulse inline-block"></div>

            </div>

            <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-4 relative">
              <div className="h-full bg-indigo-500 w-3/4 animate-pulse rounded-full"></div>
            </div>

          </div>

        </div>

      ) : (

        /* =========================
           NORMAL SCREEN
           ========================= */

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CONFIG */}

          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">

            {error && (
              <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Document category */}

            <div className="space-y-2">

              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Document Category
              </label>

              <div className="grid grid-cols-2 gap-2">

                {[
                  'PASSPORT',
                  'VISA',
                  'NATIONAL_ID',
                  'DRIVING_LICENCE',
                  'PERMIT',
                  'OTHER'
                ].map(type => (

                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={`py-2 px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-colors ${
                      docType === type
                        ? 'bg-indigo-600/10 border-indigo-500 text-white font-black'
                        : 'border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>

                ))}

              </div>

            </div>

            {/* Scenario */}

            <div className="space-y-2 pt-2 border-t border-slate-800/80">

              <div className="flex items-center gap-1.5">

                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />

                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  SIH Demonstration Mode
                </label>

              </div>

              <div className="space-y-1.5">

                {[
                  {
                    id: 'genuine',
                    title: 'Scenario 1: Genuine Travel Doc',
                    desc: 'Valid passport scan, low risk (18/100)'
                  },
                  {
                    id: 'suspicious',
                    title: 'Scenario 2: Suspicious Travel Doc',
                    desc: 'Warning details flags, medium risk (54/100)'
                  },
                  {
                    id: 'fake',
                    title: 'Scenario 3: Fake / Altered Passport',
                    desc: 'Photo replaced, expired, critical risk (91/100)'
                  }
                ].map(sc => (

                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setScenario(sc.id)}
                    className={`w-full text-left p-2.5 border rounded-lg cursor-pointer transition-all ${
                      scenario === sc.id
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'border-slate-850 bg-slate-950 text-slate-500 hover:text-slate-400'
                    }`}
                  >

                    <h5 className="text-[10px] font-bold uppercase tracking-wide">
                      {sc.title}
                    </h5>

                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {sc.desc}
                    </p>

                  </button>

                ))}

              </div>

            </div>

            {/* Start */}

            <button
              onClick={startAnalysis}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer pt-4"
            >
              <Cpu className="w-4 h-4" />
              Start AI Analysis
            </button>

          </div>

          {/* UPLOAD AREA */}

          <div className="lg:col-span-2 space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* =========================
                  DOCUMENT
                  ========================= */}

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between min-h-[300px]">

                <div>

                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Step 1: Upload Document Scan
                  </h4>

                  <p className="text-[10px] text-slate-500 font-medium">
                    PNG, JPG, JPEG, PDF up to 5MB are accepted
                  </p>

                </div>

                {docFile ? (

                  <div className="my-6 p-4 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <File className="w-8 h-8 text-indigo-500" />

                      <div className="overflow-hidden">

                        <p className="text-xs font-bold text-white truncate">
                          {docFile.name}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {(docFile.size / 1024).toFixed(1)} KB
                        </p>

                      </div>

                    </div>

                    <button
                      onClick={() => setDocFile(null)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                  </div>

                ) : (

                  <div className="my-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-8 flex flex-col items-center justify-center relative transition-colors cursor-pointer group bg-slate-950/20">

                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleDocChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />

                    <Upload className="w-10 h-10 text-slate-600 group-hover:text-indigo-400 transition-colors mb-2" />

                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300">
                      Drag file here or browse
                    </span>

                  </div>

                )}

                <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">
                  Border Agent Verification Scanner
                </span>

              </div>

              {/* =========================
                  WEBCAM LIVE FACE
                  ========================= */}

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between min-h-[300px]">

                <div>

                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <UserSquare2 className="w-4 h-4 text-indigo-400" />
                    Step 2: Traveler Live Face Capture
                  </h4>

                  <p className="text-[10px] text-slate-500 font-medium">
                    Capture a live face photo using the webcam
                  </p>

                </div>

                {liveFile ? (

                  <div className="my-6">

                    <div className="relative rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950">

                      <img
                        src={URL.createObjectURL(liveFile)}
                        alt="Captured traveler face"
                        className="w-full h-48 object-cover"
                      />

                      <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/90 rounded-md">

                        <span className="text-[9px] font-bold text-white uppercase">
                          Live Photo Captured
                        </span>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="w-full mt-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake Photo
                    </button>

                  </div>

                ) : cameraOn ? (

                  <div className="my-6">

                    <div className="relative rounded-lg overflow-hidden border border-indigo-500/50 bg-black">

                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-48 object-cover"
                        style={{
                          transform: 'scaleX(-1)'
                        }}
                      />

                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-md flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>

                        <span className="text-[9px] font-bold text-white uppercase">
                          Camera Live
                        </span>

                      </div>

                      {/* Face guide */}

                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

                        <div className="w-32 h-40 border-2 border-white/50 rounded-[50%]"></div>

                      </div>

                    </div>

                    <div className="flex gap-2 mt-3">

                      <button
                        type="button"
                        onClick={captureLivePhoto}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Live Photo
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                ) : (

                  <div className="my-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-950/20">

                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center w-full cursor-pointer"
                    >

                      <Camera className="w-10 h-10 text-indigo-400 mb-3" />

                      <span className="text-xs font-bold text-slate-400">
                        Open Camera
                      </span>

                      <span className="text-[10px] text-slate-600 mt-1">
                        Capture traveler live photo
                      </span>

                    </button>

                  </div>

                )}

                {/* Hidden canvas */}

                <canvas
                  ref={canvasRef}
                  className="hidden"
                />

                <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">
                  Biometric Checkpoint Camera
                </span>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default ScreeningPage;