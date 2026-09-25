export type DetectedFormat = 'PASSPORT' | 'ID_CARD' | 'VISA_PAGE' | 'UNKNOWN';
export type MatchLevel = 'match' | 'mismatch' | 'uncertain' | 'skip';

export interface DocPreCheckResult {
  detectedFormat: DetectedFormat;
  detectedLabel: string;
  confidence: number;
  explanation: string;
  matchLevel: MatchLevel;
  isMatch: boolean;
  isUncertain: boolean;
}

const CATEGORY_ALLOWED_FORMATS: Record<string, DetectedFormat[]> = {
  PASSPORT:        ['PASSPORT'],
  VISA:            ['VISA_PAGE', 'PASSPORT'],
  NATIONAL_ID:     ['ID_CARD'],
  DRIVING_LICENCE: ['ID_CARD'],
  PERMIT:          ['VISA_PAGE', 'ID_CARD', 'UNKNOWN'],
  OTHER:           ['PASSPORT', 'ID_CARD', 'VISA_PAGE', 'UNKNOWN'],
};

const FORMAT_LABEL: Record<DetectedFormat, string> = {
  PASSPORT:  'Passport',
  ID_CARD:   'National ID / Aadhaar / Driving Licence card',
  VISA_PAGE: 'Visa page / Permit document',
  UNKNOWN:   'Unrecognised format',
};

interface ImageSignals {
  aspectRatio: number;
  width: number;
  height: number;
  mrzScore: number;
}

function computeRowVarianceScore(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const w = canvas.width;
  const h = canvas.height;
  const stripY = Math.floor(h * 0.72);
  const stripH = h - stripY;
  if (stripH < 4) return 0;

  const imageData = ctx.getImageData(0, stripY, w, stripH);
  const d = imageData.data;
  const rows = stripH;
  const cols = w;

  let highVarRows = 0;
  let lightRows = 0;

  for (let r = 0; r < rows; r++) {
    let sum = 0;
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      const gray = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      sum += gray;
    }
    const mean = sum / cols;
    if (mean > 145) lightRows++;

    let varSum = 0;
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      const gray = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      varSum += (gray - mean) ** 2;
    }
    const variance = varSum / cols;
    if (variance > 900) highVarRows++;
  }

  const varRatio   = highVarRows / rows;
  const lightRatio = lightRows / rows;
  return Math.min(1.0, varRatio * 2.8 * 0.68 + lightRatio * 0.32);
}

async function analyzeImageFile(file: File): Promise<ImageSignals> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img  = new Image();

    img.onload = () => {
      const ANALYSIS_W = 420;
      const scale = ANALYSIS_W / img.naturalWidth;
      const ANALYSIS_H = Math.max(4, Math.round(img.naturalHeight * scale));

      const canvas    = document.createElement('canvas');
      canvas.width    = ANALYSIS_W;
      canvas.height   = ANALYSIS_H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, ANALYSIS_W, ANALYSIS_H);

      URL.revokeObjectURL(url);

      const aspect   = img.naturalWidth / img.naturalHeight;
      const mrzScore = computeRowVarianceScore(canvas);

      resolve({
        aspectRatio: Math.round(aspect * 1000) / 1000,
        width:       img.naturalWidth,
        height:      img.naturalHeight,
        mrzScore:    Math.round(mrzScore * 1000) / 1000,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

function classifySignals(sig: ImageSignals): { format: DetectedFormat; confidence: number; explanation: string } {
  const { aspectRatio: ar, mrzScore } = sig;
  const isCard     = ar >= 1.30 && ar <= 1.92;
  const isPortrait = ar >= 0.52 && ar <= 0.88;

  if (mrzScore >= 0.62) {
    const conf = Math.min(0.95, 0.60 + mrzScore * 0.35);
    return {
      format: 'PASSPORT',
      confidence: conf,
      explanation: `Machine-Readable Zone (MRZ) detected in the bottom strip (score ${(mrzScore * 100).toFixed(0)}%).`,
    };
  }

  if (isCard) {
    return {
      format: 'ID_CARD',
      confidence: 0.78,
      explanation: `Landscape credit-card ratio (${ar.toFixed(2)}:1) matches Aadhaar / National ID / Driving Licence.`,
    };
  }

  if (isPortrait) {
    if (mrzScore >= 0.38) {
      return {
        format: 'PASSPORT',
        confidence: 0.60,
        explanation: `Portrait format (${ar.toFixed(2)}) with partial MRZ signal — likely a Passport scan.`,
      };
    }
    return {
      format: 'VISA_PAGE',
      confidence: 0.47,
      explanation: `Portrait format (${ar.toFixed(2)}) without clear MRZ — may be a Visa, Permit, or scanned letter.`,
    };
  }

  return {
    format: 'UNKNOWN',
    confidence: 0.20,
    explanation: `Unusual aspect ratio (${ar.toFixed(2)}:1). Could not match any standard document template.`,
  };
}

export async function classifyDocument(
  file: File,
  selectedCategory: string
): Promise<DocPreCheckResult> {
  const category = selectedCategory.toUpperCase();

  if (category === 'OTHER') {
    return { detectedFormat: 'UNKNOWN', detectedLabel: '', confidence: 1, explanation: 'Skipped for Other category.', matchLevel: 'skip', isMatch: true, isUncertain: false };
  }

  if (!file.type.startsWith('image/')) {
    return {
      detectedFormat: 'UNKNOWN',
      detectedLabel: 'PDF / non-image file',
      confidence: 0,
      explanation: 'PDF documents cannot be visually pre-classified. Analysis will proceed.',
      matchLevel: 'uncertain',
      isMatch: true,
      isUncertain: true,
    };
  }

  let signals: ImageSignals;
  try {
    signals = await analyzeImageFile(file);
  } catch {
    return {
      detectedFormat: 'UNKNOWN',
      detectedLabel: 'Could not load',
      confidence: 0,
      explanation: 'Image could not be read. File may be corrupt or unsupported.',
      matchLevel: 'uncertain',
      isMatch: true,
      isUncertain: true,
    };
  }

  const { format, confidence, explanation } = classifySignals(signals);

  if (confidence < 0.42) {
    return {
      detectedFormat: format,
      detectedLabel: FORMAT_LABEL[format],
      confidence,
      explanation: `Low confidence — ${explanation}`,
      matchLevel: 'uncertain',
      isMatch: true,
      isUncertain: true,
    };
  }

  const allowed  = CATEGORY_ALLOWED_FORMATS[category] ?? ['UNKNOWN'];
  const isMatch  = allowed.includes(format);
  const isUncertain = confidence < 0.62;

  let matchLevel: MatchLevel;
  if (isMatch)       matchLevel = isUncertain ? 'uncertain' : 'match';
  else if (isUncertain) matchLevel = 'uncertain';
  else               matchLevel = 'mismatch';

  return {
    detectedFormat: format,
    detectedLabel:  FORMAT_LABEL[format],
    confidence,
    explanation,
    matchLevel,
    isMatch,
    isUncertain,
  };
}
