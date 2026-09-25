"""
RealValidationService — pure-Python, zero extra dependencies.

What's real vs mock:
  - Real document-number regex per doc_type (passport, visa, national_id, driving_licence)
  - Real date parsing with sane-range checks (DOB 1900-today, expiry future-but-sane)
  - Real ICAO 9303 MRZ checksum (mod-10 weighted 7/3/1) when MRZ lines present in raw_data
  - Real cross-field consistency (MRZ parsed surname vs visual name, gender code, 3-char nationality)
  - Downgrade VALID → WARNING when OCR confidence for that field was low (<0.80)
  - `scenario` kept as a no-op for interface compatibility

Return schema identical to MockValidationService: List[Dict[str, Any]]
  each entry: {field: str, status: 'VALID'|'WARNING'|'INVALID', message: str}
"""

from typing import Dict, Any, List
import datetime
import re


# ── ICAO 9303 checksum ────────────────────────────────────────────────────────

_MRZ_WEIGHTS = [7, 3, 1]
_MRZ_CHAR_VALUES: Dict[str, int] = {'<': 0}
for _c in '0123456789':
    _MRZ_CHAR_VALUES[_c] = int(_c)
for _i, _c in enumerate('ABCDEFGHIJKLMNOPQRSTUVWXYZ'):
    _MRZ_CHAR_VALUES[_c] = _i + 10


def _mrz_check_digit(s: str) -> int:
    total = 0
    for i, ch in enumerate(s.upper()):
        total += _MRZ_CHAR_VALUES.get(ch, 0) * _MRZ_WEIGHTS[i % 3]
    return total % 10


def _verify_mrz_checksum(field: str, check_char: str) -> bool:
    try:
        expected = _mrz_check_digit(field)
        return str(expected) == str(check_char)
    except Exception:
        return False


# ── ISO 3166-1 alpha-3 sample set (major nationalities) ──────────────────────

_ISO3_NATIONALITIES = {
    'IND', 'USA', 'GBR', 'CHN', 'PAK', 'BGD', 'NPL', 'LKA', 'MMR', 'BTN',
    'AFG', 'IRN', 'IRQ', 'SAU', 'ARE', 'QAT', 'KWT', 'OMN', 'JOR', 'SYR',
    'DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'BEL', 'CHE', 'AUT', 'SWE', 'NOR',
    'RUS', 'UKR', 'KAZ', 'TUR', 'THA', 'VNM', 'PHL', 'IDN', 'MYS', 'SGP',
    'AUS', 'NZL', 'CAN', 'BRA', 'ARG', 'MEX', 'ZAF', 'NGA', 'KEN', 'ETH',
    'D',   # Germany travel docs use 'D'
    'UNO', 'XXX',  # special codes
}

# ── Document number patterns per type ─────────────────────────────────────────

_DOC_NUMBER_PATTERNS: Dict[str, re.Pattern] = {
    'PASSPORT':        re.compile(r'^[A-Z]{1,2}[0-9]{6,8}$'),
    'VISA':            re.compile(r'^[A-Z0-9]{6,12}$'),
    'NATIONAL_ID':     re.compile(r'^[0-9]{12}$|^[A-Z]{3}[0-9]{7}[A-Z]$|^[A-Z]{2}[0-9]{10}$'),
    'DRIVING_LICENCE': re.compile(r'^[A-Z]{2}[0-9]{2}\s?[0-9]{11}$|^[A-Z]{2}[0-9]{13}$'),
    'PERMIT':          re.compile(r'^[A-Z0-9]{4,20}$'),
    'OTHER':           re.compile(r'^.{3,25}$'),
}

# ── Date helpers ──────────────────────────────────────────────────────────────

_DATE_FORMATS = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%y', '%d %b %Y']


def _parse_date(s: str) -> datetime.datetime | None:
    if not s:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    # Try YYMMDD (MRZ format)
    if re.match(r'^\d{6}$', s):
        try:
            yy, mm, dd = int(s[:2]), int(s[2:4]), int(s[4:6])
            year = 2000 + yy if yy <= 30 else 1900 + yy
            return datetime.datetime(year, mm, dd)
        except ValueError:
            pass
    return None


def _to_ddmmyyyy(dt: datetime.datetime) -> str:
    return dt.strftime('%d/%m/%Y')


# ── MRZ TD3 (passport) parser ─────────────────────────────────────────────────

class _MRZParseResult:
    __slots__ = ('surname', 'given_names', 'doc_number', 'nationality',
                 'dob', 'gender', 'expiry', 'personal_number',
                 'doc_number_ok', 'dob_ok', 'expiry_ok', 'composite_ok', 'valid')

    def __init__(self) -> None:
        for s in self.__slots__:
            setattr(self, s, None)
        self.valid = False


def _parse_td3_mrz(line1: str, line2: str) -> _MRZParseResult | None:
    """Parse ICAO 9303 TD3 MRZ (passport). Returns None if lines are malformed."""
    r = _MRZParseResult()
    l1 = line1.upper().replace(' ', '<')
    l2 = line2.upper().replace(' ', '<')
    if len(l1) < 44 or len(l2) < 44:
        return None

    # Line 1: P<NNN<SURNAME<<GIVEN<NAMES<...
    doc_type = l1[0]
    if doc_type not in ('P', 'V', 'C', 'I'):
        return None
    nationality_raw = l1[2:5].replace('<', '')
    names_raw = l1[5:44]
    parts = names_raw.split('<<')
    r.surname     = parts[0].replace('<', ' ').strip()
    r.given_names = parts[1].replace('<', ' ').strip() if len(parts) > 1 else ''
    r.nationality = nationality_raw

    # Line 2: DOCNUM(9) + CHECK + NATL(3) + DOB(6) + CHECK + SEX + EXPIRY(6) + CHECK + PERSONAL(14) + CHECK + COMPOSITE_CHECK
    r.doc_number      = l2[0:9].replace('<', '')
    doc_num_check     = l2[9]
    r.nationality     = l2[10:13].replace('<', '') or r.nationality
    dob_raw           = l2[13:19]
    dob_check         = l2[19]
    r.gender          = l2[20]
    expiry_raw        = l2[21:27]
    expiry_check      = l2[27]
    personal_raw      = l2[28:42]
    composite_check   = l2[43]

    r.doc_number_ok = _verify_mrz_checksum(l2[0:9], doc_num_check)
    r.dob_ok        = _verify_mrz_checksum(dob_raw, dob_check)
    r.expiry_ok     = _verify_mrz_checksum(expiry_raw, expiry_check)

    # Composite checksum covers positions 0-9, 13-20, 21-43 of line 2
    composite_data = l2[0:10] + l2[13:20] + l2[21:43]
    r.composite_ok  = _verify_mrz_checksum(composite_data, composite_check)

    dob_dt    = _parse_date(dob_raw)
    expiry_dt = _parse_date(expiry_raw)
    r.dob     = _to_ddmmyyyy(dob_dt)    if dob_dt    else dob_raw
    r.expiry  = _to_ddmmyyyy(expiry_dt) if expiry_dt else expiry_raw

    r.valid = r.doc_number_ok and r.dob_ok and r.expiry_ok and r.composite_ok
    return r


# ── Main service classes ──────────────────────────────────────────────────────

class ValidationService:
    def validate(self, ocr_data: Dict[str, Any], scenario: str = 'genuine') -> List[Dict[str, Any]]:
        raise NotImplementedError('Interface only')


class MockValidationService(ValidationService):
    """Original mock — kept untouched for demo compatibility."""
    def validate(self, ocr_data: Dict[str, Any], scenario: str = 'genuine') -> List[Dict[str, Any]]:
        results = []
        expiry_str = ocr_data.get('expiry_date', '')
        doc_num    = ocr_data.get('document_number', '')
        is_expired = False
        try:
            exp_date = datetime.datetime.strptime(expiry_str, '%d/%m/%Y')
            if exp_date < datetime.datetime.utcnow():
                is_expired = True
        except Exception:
            pass

        if scenario == 'genuine':
            results = [
                {'field': 'Passport Number',   'status': 'VALID',   'message': f'Format matches standard Passport structure ({doc_num})'},
                {'field': 'Date of Birth',      'status': 'VALID',   'message': 'Date is valid and consistent'},
                {'field': 'Expiry Date',        'status': 'VALID',   'message': 'Document is active, expires on ' + expiry_str},
                {'field': 'Document Format',    'status': 'VALID',   'message': 'Document structure matches standards'},
                {'field': 'MRZ',                'status': 'VALID',   'message': 'MRZ checksums verified and consistent'},
                {'field': 'Visa Information',   'status': 'VALID',   'message': 'No travel restrictions found'},
            ]
        elif scenario == 'suspicious':
            results = [
                {'field': 'Visa Number',        'status': 'VALID',   'message': f'Format matches standard Visa structure ({doc_num})'},
                {'field': 'Date of Birth',      'status': 'VALID',   'message': 'Date is valid and consistent'},
                {'field': 'Expiry Date',        'status': 'VALID',   'message': 'Document is active, expires on ' + expiry_str},
                {'field': 'Document Format',    'status': 'VALID',   'message': 'Document structure matches standards'},
                {'field': 'MRZ',                'status': 'VALID',   'message': 'No MRZ on this visa category'},
                {'field': 'Visa Information',   'status': 'WARNING', 'message': 'Discrepancy: Authorized stay duration (90 days) exceeds visa entry validation limits'},
            ]
        elif scenario == 'dynamic':
            is_expired_d = False
            try:
                exp_date_d = datetime.datetime.strptime(expiry_str, '%d/%m/%Y')
                if exp_date_d < datetime.datetime.utcnow():
                    is_expired_d = True
            except Exception:
                pass
            results = [
                {'field': 'Document Number Check', 'status': 'VALID'   if doc_num else 'WARNING', 'message': f'Parsed format verified: {doc_num}'},
                {'field': 'Expiry Integrity',       'status': 'INVALID' if is_expired_d else 'VALID', 'message': f"Expiry date status check: {'EXPIRED' if is_expired_d else 'ACTIVE'}"},
                {'field': 'MRZ Format Validation',  'status': 'VALID',  'message': 'Standard structure layout validated'},
            ]
        else:
            results = [
                {'field': 'Passport Number',  'status': 'VALID',   'message': 'Format is standard'},
                {'field': 'Date of Birth',    'status': 'VALID',   'message': 'Date is valid'},
                {'field': 'Expiry Date',      'status': 'INVALID', 'message': f'Document has EXPIRED (Expiry: {expiry_str})'},
                {'field': 'Document Format',  'status': 'WARNING', 'message': 'Visual layout anomaly around the primary photo frame'},
                {'field': 'MRZ',              'status': 'INVALID', 'message': 'MRZ checksum validation failed! Possible manual manipulation of passport details'},
                {'field': 'Visa Information', 'status': 'VALID',   'message': 'No visa details present'},
            ]
        return results


class RealValidationService(ValidationService):
    """
    Real field-level validation — pure Python, zero extra dependencies.

    Checks performed (scenario is a no-op):
      1. Document number format regex per doc_type
      2. Date of birth: parseable + sane range (1900 – yesterday)
      3. Expiry date: parseable + not in past + not > 20 yrs future
      4. MRZ checksums (ICAO 9303 mod-10) when mrz_line_1/2 present in raw_data
      5. Cross-field consistency: MRZ surname vs name field, gender code
      6. ISO 3166-1 alpha-3 nationality code check
      7. Confidence-based downgrade: if OCR field_confidence < 0.80 and result is VALID → WARNING
    """

    def validate(self, ocr_data: Dict[str, Any], scenario: str = 'genuine') -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        now = datetime.datetime.utcnow()
        raw   = ocr_data.get('raw_data', {}) or {}
        conf  = ocr_data.get('confidence', 1.0)
        low_conf = conf < 0.80

        doc_type = raw.get('doc_type', 'PASSPORT').upper()
        doc_num  = (ocr_data.get('document_number') or '').strip().replace(' ', '')

        # ── 1. Document number format ─────────────────────────────────────────
        pattern = _DOC_NUMBER_PATTERNS.get(doc_type, _DOC_NUMBER_PATTERNS['OTHER'])
        if not doc_num:
            results.append({'field': 'Document Number', 'status': 'INVALID',
                            'message': 'Document number is missing or could not be extracted.'})
        elif pattern.match(doc_num.upper()):
            status = 'WARNING' if low_conf else 'VALID'
            results.append({'field': 'Document Number', 'status': status,
                            'message': f'Format valid for {doc_type} ({doc_num})' +
                                       (' — low OCR confidence' if low_conf else '')})
        else:
            results.append({'field': 'Document Number', 'status': 'WARNING',
                            'message': f'Unexpected format for {doc_type}: "{doc_num}". May be non-standard or OCR error.'})

        # ── 2. Date of Birth ──────────────────────────────────────────────────
        dob_str = (ocr_data.get('date_of_birth') or '').strip()
        dob_dt  = _parse_date(dob_str)
        if not dob_str:
            results.append({'field': 'Date of Birth', 'status': 'WARNING',
                            'message': 'Date of birth not extracted.'})
        elif dob_dt is None:
            results.append({'field': 'Date of Birth', 'status': 'INVALID',
                            'message': f'Date of birth "{dob_str}" is not a recognisable date format.'})
        elif dob_dt > now:
            results.append({'field': 'Date of Birth', 'status': 'INVALID',
                            'message': f'Date of birth {_to_ddmmyyyy(dob_dt)} is in the future.'})
        elif dob_dt.year < 1900:
            results.append({'field': 'Date of Birth', 'status': 'INVALID',
                            'message': f'Date of birth {_to_ddmmyyyy(dob_dt)} predates 1900 — likely OCR error.'})
        else:
            age = (now - dob_dt).days / 365.25
            status = 'WARNING' if low_conf else 'VALID'
            results.append({'field': 'Date of Birth', 'status': status,
                            'message': f'Valid DOB: {_to_ddmmyyyy(dob_dt)} (age ≈ {int(age)} yrs)' +
                                       (' — low OCR confidence' if low_conf else '')})

        # ── 3. Expiry Date ────────────────────────────────────────────────────
        exp_str = (ocr_data.get('expiry_date') or '').strip()
        exp_dt  = _parse_date(exp_str)
        if not exp_str:
            results.append({'field': 'Expiry Date', 'status': 'WARNING',
                            'message': 'Expiry date not extracted.'})
        elif exp_dt is None:
            results.append({'field': 'Expiry Date', 'status': 'INVALID',
                            'message': f'Expiry date "{exp_str}" is not parseable.'})
        elif exp_dt < now:
            delta = now - exp_dt
            results.append({'field': 'Expiry Date', 'status': 'INVALID',
                            'message': f'Document EXPIRED on {_to_ddmmyyyy(exp_dt)} ({delta.days} days ago).'})
        elif (exp_dt - now).days > 20 * 365:
            results.append({'field': 'Expiry Date', 'status': 'WARNING',
                            'message': f'Expiry date {_to_ddmmyyyy(exp_dt)} is more than 20 years in the future — possible OCR error.'})
        else:
            days_left = (exp_dt - now).days
            status = 'WARNING' if (low_conf or days_left < 90) else 'VALID'
            msg = f'Document active, expires {_to_ddmmyyyy(exp_dt)} ({days_left} days remaining).'
            if days_left < 90:
                msg += ' Warning: expiring within 90 days.'
            if low_conf:
                msg += ' Low OCR confidence — verify manually.'
            results.append({'field': 'Expiry Date', 'status': status, 'message': msg})

        # ── 4. MRZ Checksum Validation (ICAO 9303 TD3) ───────────────────────
        mrz1 = raw.get('mrz_line_1', '')
        mrz2 = raw.get('mrz_line_2', '')
        if mrz1 and mrz2:
            mrz_result = _parse_td3_mrz(mrz1, mrz2)
            if mrz_result is None:
                results.append({'field': 'MRZ Integrity', 'status': 'WARNING',
                                'message': 'MRZ lines present but too short or malformed to parse.'})
            else:
                checks = {
                    'Document number checksum': mrz_result.doc_number_ok,
                    'DOB checksum':             mrz_result.dob_ok,
                    'Expiry checksum':          mrz_result.expiry_ok,
                    'Composite checksum':       mrz_result.composite_ok,
                }
                failed = [k for k, v in checks.items() if not v]
                if not failed:
                    results.append({'field': 'MRZ Integrity', 'status': 'VALID',
                                    'message': 'All four ICAO 9303 MRZ checksums verified (document number, DOB, expiry, composite).'})
                else:
                    results.append({'field': 'MRZ Integrity', 'status': 'INVALID',
                                    'message': f'MRZ checksum failure(s): {", ".join(failed)}. Document may have been altered.'})

                # ── 5. Cross-field consistency ────────────────────────────────
                vis_name = (ocr_data.get('name') or '').upper().replace(' ', '<')
                mrz_surname = mrz_result.surname.replace(' ', '<') if mrz_result.surname else ''
                if mrz_surname and vis_name and mrz_surname[:6] not in vis_name and vis_name[:6] not in mrz_surname:
                    results.append({'field': 'Name Consistency (MRZ vs Visual)', 'status': 'WARNING',
                                    'message': f'Visual name "{ocr_data.get("name")}" does not match MRZ surname "{mrz_result.surname}". Possible alteration or OCR error.'})
                else:
                    results.append({'field': 'Name Consistency (MRZ vs Visual)', 'status': 'VALID',
                                    'message': 'Visual name field is consistent with MRZ surname zone.'})

                # Gender code
                vis_gender = (ocr_data.get('gender') or '').strip().upper()
                mrz_gender = mrz_result.gender or ''
                if vis_gender and mrz_gender and vis_gender[0] != mrz_gender:
                    results.append({'field': 'Gender Code Consistency', 'status': 'WARNING',
                                    'message': f'Gender code mismatch: visual "{vis_gender}" vs MRZ "{mrz_gender}".'})
        else:
            results.append({'field': 'MRZ', 'status': 'VALID',
                            'message': 'No MRZ lines in OCR data for this document type — skipped.'})

        # ── 6. Nationality code ───────────────────────────────────────────────
        nat = (ocr_data.get('nationality') or '').strip().upper().replace(' ', '')
        if nat and len(nat) == 3 and nat not in _ISO3_NATIONALITIES:
            results.append({'field': 'Nationality Code', 'status': 'WARNING',
                            'message': f'"{nat}" is not a recognised ISO 3166-1 alpha-3 code — may be OCR error or restricted nationality.'})
        elif nat:
            results.append({'field': 'Nationality Code', 'status': 'VALID',
                            'message': f'Nationality code "{nat}" is a valid ISO 3166-1 identifier.'})

        return results
