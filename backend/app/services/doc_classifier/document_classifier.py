from PIL import Image, ImageStat
from typing import Dict, Any, List


CATEGORY_FORMAT_MAP: Dict[str, List[str]] = {
    'PASSPORT':        ['PASSPORT'],
    'VISA':            ['VISA_PAGE', 'PASSPORT'],
    'NATIONAL_ID':     ['ID_CARD'],
    'DRIVING_LICENCE': ['ID_CARD'],
    'PERMIT':          ['PERMIT_DOC', 'ID_CARD'],
    'OTHER':           ['OTHER', 'ID_CARD', 'PASSPORT', 'VISA_PAGE', 'PERMIT_DOC'],
}


class DocumentTypeClassifier:
    """
    Classifies document type using image signals only (Pillow — no OCR required).

    Signals used:
      1. Aspect ratio  — passport (portrait ~0.7), ID card (landscape ~1.6)
      2. MRZ zone      — bottom-20% pixel-row variance → detects text-dense MRZ bands
      3. Brightness    — document brightness distribution

    Returns:
      detected_format  : 'PASSPORT' | 'ID_CARD' | 'VISA_PAGE' | 'PERMIT_DOC' | 'UNKNOWN'
      detected_label   : human-readable label
      confidence       : 0.0 – 1.0
      explanation      : why the classification was made
      is_match         : whether detected format is compatible with selected category
      is_uncertain     : True if confidence < 0.55 (soft warning, not hard block)
    """

    def classify(self, image_path: str, selected_category: str = 'OTHER') -> Dict[str, Any]:
        if selected_category.upper() == 'OTHER':
            return self._skip_result(selected_category)

        import os
        if not os.path.exists(image_path):
            return self._error_result('File not found on server.', selected_category)

        ext = os.path.splitext(image_path)[1].lower()
        if ext == '.pdf':
            return {
                'detected_format': 'UNKNOWN',
                'detected_label': 'PDF Document',
                'confidence': 0.0,
                'explanation': 'PDF documents cannot be visually classified without a renderer. Analysis will proceed.',
                'is_match': True,
                'is_uncertain': True,
                'selected_category': selected_category,
            }

        try:
            img = Image.open(image_path).convert('RGB')
        except Exception as e:
            return self._error_result(f'Could not open image: {e}', selected_category)

        w, h = img.size
        if w == 0 or h == 0:
            return self._error_result('Image has zero dimensions.', selected_category)

        aspect = w / h
        mrz_score = self._detect_mrz(img)

        signals = {
            'aspect_ratio': round(aspect, 3),
            'width': w,
            'height': h,
            'mrz_score': round(mrz_score, 3),
        }

        fmt, confidence, explanation = self._classify_signals(aspect, mrz_score)

        expected_formats = CATEGORY_FORMAT_MAP.get(selected_category.upper(), ['OTHER'])
        is_match = fmt in expected_formats or confidence < 0.50

        label = {
            'PASSPORT':    'Passport',
            'ID_CARD':     'National ID / Aadhaar / Driving Licence card',
            'VISA_PAGE':   'Visa page / Permit document',
            'PERMIT_DOC':  'Permit or multi-page document',
            'UNKNOWN':     'Unrecognised format',
        }.get(fmt, fmt)

        return {
            'detected_format': fmt,
            'detected_label': label,
            'confidence': round(confidence, 3),
            'explanation': explanation,
            'is_match': is_match,
            'is_uncertain': confidence < 0.55,
            'selected_category': selected_category,
            'signals': signals,
        }

    # ── core signal classifier ────────────────────────────────────────────────

    def _classify_signals(self, aspect: float, mrz_score: float):
        is_card    = 1.30 <= aspect <= 1.92
        is_portrait = 0.52 <= aspect <= 0.88

        if mrz_score >= 0.62:
            conf = min(0.95, 0.62 + mrz_score * 0.33)
            return 'PASSPORT', conf, (
                f'Machine-Readable Zone (MRZ) detected in the bottom section '
                f'(MRZ score {mrz_score:.2f}). Consistent with a Passport data page.'
            )

        if is_card:
            return 'ID_CARD', 0.78, (
                f'Landscape credit-card aspect ratio ({aspect:.2f}:1) matches '
                f'National ID / Aadhaar / Driving Licence format.'
            )

        if is_portrait:
            if mrz_score >= 0.38:
                return 'PASSPORT', 0.62, (
                    f'Portrait document ({aspect:.2f}) with partial MRZ-like pattern '
                    f'(score {mrz_score:.2f}). Likely a Passport scan.'
                )
            return 'VISA_PAGE', 0.48, (
                f'Portrait format ({aspect:.2f}) without strong MRZ. '
                f'Could be a Visa, Permit, or full-page document scan.'
            )

        return 'UNKNOWN', 0.22, (
            f'Unusual aspect ratio ({aspect:.2f}:1). Could not match any '
            f'standard document format. Check that the correct file was uploaded.'
        )

    # ── MRZ detection ─────────────────────────────────────────────────────────

    def _detect_mrz(self, img: Image.Image) -> float:
        """
        Detects the Machine-Readable Zone in the bottom 25% of the image.

        MRZ = two dense rows of OCR-A characters on a white background.
        Those rows produce high per-row pixel variance (dark chars on white bg)
        while the background rows are uniformly light.

        Returns 0.0 – 1.0 (higher = more likely MRZ present).
        """
        w, h = img.size
        strip_top = int(h * 0.72)
        strip = img.crop((0, strip_top, w, h)).convert('L')

        target_w = 380
        scale = target_w / strip.width
        target_h = max(4, int(strip.height * scale))
        strip = strip.resize((target_w, target_h), Image.BILINEAR)

        pixels = list(strip.getdata())
        cols = target_w
        rows = target_h

        row_variances = []
        row_means = []
        for r in range(rows):
            row_px = pixels[r * cols:(r + 1) * cols]
            mean = sum(row_px) / cols
            var = sum((p - mean) ** 2 for p in row_px) / cols
            row_variances.append(var)
            row_means.append(mean)

        high_var_rows = sum(1 for v in row_variances if v > 900)
        light_rows    = sum(1 for m in row_means if m > 145)

        var_score   = min(1.0, (high_var_rows / rows) * 2.8)
        light_score = light_rows / rows

        return min(1.0, var_score * 0.68 + light_score * 0.32)

    # ── helpers ───────────────────────────────────────────────────────────────

    def _skip_result(self, category: str) -> Dict[str, Any]:
        return {
            'detected_format': 'OTHER',
            'detected_label': 'Other',
            'confidence': 1.0,
            'explanation': 'Document type pre-check skipped for "Other" category.',
            'is_match': True,
            'is_uncertain': False,
            'selected_category': category,
        }

    def _error_result(self, msg: str, category: str) -> Dict[str, Any]:
        return {
            'detected_format': 'UNKNOWN',
            'detected_label': 'Unknown',
            'confidence': 0.0,
            'explanation': f'Pre-check error: {msg}',
            'is_match': True,
            'is_uncertain': True,
            'selected_category': category,
        }
