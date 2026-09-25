import os
import shutil
import hashlib
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.models import Screening, Document, OCRResult, ValidationResult, TamperingResult, FaceResult, RiskResult, AuditLog, User
from app.schemas.schemas import ScreeningResponse, ScreeningCreate, ScreeningUpdate, DocumentResponse, OCRResultResponse, ValidationResultResponse, TamperingResultResponse, FaceResultResponse, RiskResultResponse
from app.core.config import settings
from app.api.deps import get_current_user, RoleChecker

# AI Services
from app.services.ocr.ocr_service import MockOCRService
from app.services.validation.validation_service import MockValidationService
from app.services.tampering.tampering_service import MockTamperingDetectionService
from app.services.face.face_service import MockFaceVerificationService
from app.services.risk.risk_service import RiskEngine
from app.services.report_generator import ReportGenerator

router = APIRouter()

# Service factories

def get_ocr_service(mode: str):
    if mode == "DEMO":
        return MockOCRService()
    return RealOCRService()

def get_validation_service(mode: str):
    if mode == "DEMO":
        return MockValidationService()
    return RealValidationService()

def get_tamper_service(mode: str):
    if mode == "DEMO":
        return MockTamperingDetectionService()
    return RealTamperingDetectionService()

def get_face_service(mode: str):
    if mode == "DEMO":
        return MockFaceVerificationService()
    return RealFaceVerificationService()

# Updated endpoints to accept analysis_mode and select appropriate services

@router.post("/ocr/extract", response_model=OCRResultResponse)
def extract_ocr(
    screening_id: int = Form(...),
    analysis_mode: str = Form("REAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    """Extract OCR data using selected mode."""
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Please upload a document before running OCR extraction.")

    ocr_service = get_ocr_service(analysis_mode)
    ocr_data = ocr_service.extract(doc.file_path, scenario="dynamic", doc_type=doc.document_type)

    # Clean existing OCR result
    existing = db.query(OCRResult).filter(OCRResult.screening_id == screening_id).first()
    if existing:
        db.delete(existing)

    ocr_result = OCRResult(
        screening_id=screening_id,
        name=ocr_data.get("name"),
        document_number=ocr_data.get("document_number"),
        nationality=ocr_data.get("nationality"),
        date_of_birth=ocr_data.get("date_of_birth"),
        gender=ocr_data.get("gender"),
        expiry_date=ocr_data.get("expiry_date"),
        confidence=ocr_data.get("confidence", 0),
        raw_data=ocr_data.get("raw_data")
    )
    db.add(ocr_result)
    db.commit()
    db.refresh(ocr_result)
    return ocr_result

@router.post("/documents/validate", response_model=List[ValidationResultResponse])
def validate_document(
    screening_id: int = Form(...),
    analysis_mode: str = Form("REAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    ocr = db.query(OCRResult).filter(OCRResult.screening_id == screening_id).first()
    if not ocr:
        raise HTTPException(status_code=400, detail="OCR details are missing. Please run OCR extraction first.")

    val_service = get_validation_service(analysis_mode)
    logs = val_service.validate({
        "expiry_date": ocr.expiry_date,
        "document_number": ocr.document_number,
    }, scenario="dynamic")

    db.query(ValidationResult).filter(ValidationResult.screening_id == screening_id).delete()
    val_records = []
    for log in logs:
        rec = ValidationResult(
            screening_id=screening_id,
            field=log["field"],
            status=log["status"],
            message=log["message"]
        )
        db.add(rec)
        val_records.append(rec)
    db.commit()
    return val_records

@router.post("/tampering/analyze", response_model=TamperingResultResponse)
def analyze_tampering(
    screening_id: int = Form(...),
    analysis_mode: str = Form("REAL"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Document missing. Upload document first.")

    tamper_service = get_tamper_service(analysis_mode)
    tamp_data = tamper_service.analyze(doc.file_path, scenario="dynamic")

    db.query(TamperingResult).filter(TamperingResult.screening_id == screening_id).delete()
    tamper_result = TamperingResult(
        screening_id=screening_id,
        photo_replacement_score=tamp_data["photo_replacement_score"],
        text_manipulation_score=tamp_data["text_manipulation_score"],
        stamp_score=tamp_data["stamp_score"],
        metadata_score=tamp_data["metadata_score"],
        overall_probability=tamp_data["overall_probability"]
    )
    db.add(tamper_result)
    db.commit()
    db.refresh(tamper_result)
    return tamper_result

@router.post("/face/verify", response_model=FaceResultResponse)
def verify_face(
    screening_id: int = Form(...),
    analysis_mode: str = Form("REAL"),
    live_image_path: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Document missing.")

    face_service = get_face_service(analysis_mode)
    face_data = face_service.verify(doc.file_path, live_image_path)

    db.query(FaceResult).filter(FaceResult.screening_id == screening_id).delete()
    face_result = FaceResult(
        screening_id=screening_id,
        similarity_score=face_data["similarity_score"],
        match_status=face_data["match_status"]
    )
    db.add(face_result)
    db.commit()
    db.refresh(face_result)
    return face_result

# Helpers
def compute_sha256(file_path: str) -> str:
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def update_audit_chain(db: Session, screening: Screening, user_id: int) -> AuditLog:
    # 1. Find last chained hash block
    last_audit = db.query(AuditLog).filter(AuditLog.current_hash != None).order_by(AuditLog.id.desc()).first()
    previous_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    if last_audit and last_audit.current_hash:
        previous_hash = last_audit.current_hash

    # 2. Compute current hash
    action = f"Screening {screening.screening_id} completed"
    timestamp_str = datetime.datetime.utcnow().isoformat()
    block_data = f"{screening.id}|{action}|{timestamp_str}|{user_id}|{screening.risk_score}|{previous_hash}"
    current_hash = hashlib.sha256(block_data.encode("utf-8")).hexdigest()

    # 3. Create record
    audit = AuditLog(
        screening_id=screening.id,
        action=action,
        user_id=user_id,
        timestamp=datetime.datetime.utcnow(),
        current_hash=current_hash,
        previous_hash=previous_hash
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

# --- Endpoint Definitions ---

@router.post("/screenings", response_model=ScreeningResponse)
def create_screening(
    screening_in: ScreeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    """
    Creates a new empty screening. Generates a unique screening ID.
    """
    # Auto-generate screening_id
    last_scr = db.query(Screening).order_by(Screening.id.desc()).first()
    next_id = (last_scr.id + 1) if last_scr else 1
    screening_id_str = f"SSB-2026-{next_id:05d}"

    screening = Screening(
        screening_id=screening_id_str,
        user_id=current_user.id,
        document_type=screening_in.document_type.upper(),
        status="NEW",
        risk_score=0,
        risk_level="LOW",
        created_at=datetime.datetime.utcnow()
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)
    return screening

@router.post("/documents/upload", response_model=DocumentResponse)
def upload_document(
    screening_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    """
    Uploads a document image, validates type & size, computes SHA-256 hash, and saves it.
    """
    # 1. Fetch screening
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")

    # 2. Validate file type
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use JPG, JPEG, PNG, or PDF.")

    # 3. Save file temporarily to validate size
    os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIRECTORY, f"scr_{screening_id}_doc{ext}")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file to storage: {e}")

    # Check file size
    if os.path.getsize(file_path) > settings.MAX_FILE_SIZE:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="File exceeds maximum allowable size (5MB)")

    # 4. Calculate file hash
    file_hash = compute_sha256(file_path)

    # Remove previous document for this screening if it exists
    existing_doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if existing_doc:
        db.delete(existing_doc)

    # 5. Create Document model
    doc = Document(
        screening_id=screening_id,
        file_path=file_path,
        document_type=screening.document_type,
        file_hash=file_hash,
        uploaded_at=datetime.datetime.utcnow()
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.post("/documents/verify-type")
def verify_document_type(
    screening_id: int = Form(...),
    selected_category: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Pre-analysis document type check.
    Classifies the uploaded image using aspect-ratio + MRZ zone analysis (Pillow only).
    Returns: detected_format, confidence, is_match, is_uncertain, explanation.
    """
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="No document uploaded for this screening.")

    from app.services.doc_classifier.document_classifier import DocumentTypeClassifier
    classifier = DocumentTypeClassifier()
    result = classifier.classify(doc.file_path, selected_category)
    return result

@router.post("/ocr/extract", response_model=OCRResultResponse)
def extract_ocr(
    screening_id: int = Form(...),
    scenario: str = Form("dynamic"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    # Verify screening and doc exist
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Please upload a document before running OCR extraction.")

    ocr_data = ocr_service.extract(doc.file_path, scenario=scenario, doc_type=doc.document_type)

    # Clean existing
    existing = db.query(OCRResult).filter(OCRResult.screening_id == screening_id).first()
    if existing:
        db.delete(existing)

    ocr_result = OCRResult(
        screening_id=screening_id,
        name=ocr_data["name"],
        document_number=ocr_data["document_number"],
        nationality=ocr_data["nationality"],
        date_of_birth=ocr_data["date_of_birth"],
        gender=ocr_data["gender"],
        expiry_date=ocr_data["expiry_date"],
        confidence=ocr_data["confidence"],
        raw_data=ocr_data["raw_data"]
    )
    db.add(ocr_result)
    db.commit()
    db.refresh(ocr_result)
    return ocr_result

@router.post("/documents/validate", response_model=List[ValidationResultResponse])
def validate_document(
    screening_id: int = Form(...),
    scenario: str = Form("dynamic"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    ocr = db.query(OCRResult).filter(OCRResult.screening_id == screening_id).first()
    if not ocr:
        raise HTTPException(status_code=400, detail="OCR details are missing. Please run OCR extraction first.")

    logs = val_service.validate(
        {"expiry_date": ocr.expiry_date, "document_number": ocr.document_number},
        scenario=scenario
    )

    # Clean existing validation results
    db.query(ValidationResult).filter(ValidationResult.screening_id == screening_id).delete()

    val_records = []
    for log in logs:
        rec = ValidationResult(
            screening_id=screening_id,
            field=log["field"],
            status=log["status"],
            message=log["message"]
        )
        db.add(rec)
        val_records.append(rec)

    db.commit()
    return val_records

@router.post("/tampering/analyze", response_model=TamperingResultResponse)
def analyze_tampering(
    screening_id: int = Form(...),
    scenario: str = Form("dynamic"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Document missing. Upload document first.")

    tamp_data = tamper_service.analyze(doc.file_path, scenario=scenario)

    db.query(TamperingResult).filter(TamperingResult.screening_id == screening_id).delete()

    tamper_result = TamperingResult(
        screening_id=screening_id,
        photo_replacement_score=tamp_data["photo_replacement_score"],
        text_manipulation_score=tamp_data["text_manipulation_score"],
        stamp_score=tamp_data["stamp_score"],
        metadata_score=tamp_data["metadata_score"],
        overall_probability=tamp_data["overall_probability"]
    )
    db.add(tamper_result)
    db.commit()
    db.refresh(tamper_result)
    return tamper_result

@router.post("/face/verify", response_model=FaceResultResponse)
def verify_face(
    screening_id: int = Form(...),
    scenario: str = Form("dynamic"),
    live_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    doc = db.query(Document).filter(Document.screening_id == screening_id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="Document missing. Upload document first.")

    # Save live face path if uploaded
    live_face_path = ""
    if live_file:
        live_ext = os.path.splitext(live_file.filename)[1].lower()
        live_face_path = os.path.join(settings.UPLOAD_DIRECTORY, f"scr_{screening_id}_live{live_ext}")
        with open(live_face_path, "wb") as buffer:
            shutil.copyfileobj(live_file.file, buffer)

    face_data = face_service.verify(
        document_face_path=doc.file_path,
        live_face_path=live_face_path,
        scenario=scenario
    )

    db.query(FaceResult).filter(FaceResult.screening_id == screening_id).delete()

    face_result = FaceResult(
        screening_id=screening_id,
        similarity_score=face_data["similarity_score"],
        match_status=face_data["match_status"]
    )
    db.add(face_result)
    db.commit()
    db.refresh(face_result)
    return face_result

@router.post("/risk/calculate", response_model=RiskResultResponse)
def calculate_risk(
    screening_id: int = Form(...),
    scenario: str = Form("dynamic"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    screening = db.query(Screening).filter(Screening.id == screening_id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    ocr = db.query(OCRResult).filter(OCRResult.screening_id == screening_id).first()
    tamp = db.query(TamperingResult).filter(TamperingResult.screening_id == screening_id).first()
    face = db.query(FaceResult).filter(FaceResult.screening_id == screening_id).first()
    val_logs_db = db.query(ValidationResult).filter(ValidationResult.screening_id == screening_id).all()

    val_logs = [{"field": v.field, "status": v.status, "message": v.message} for v in val_logs_db]

    # Defaults if missing
    ocr_conf = ocr.confidence if ocr else 1.0
    tamp_prob = tamp.overall_probability if tamp else 0.0
    face_sim = face.similarity_score if face else 1.0

    risk_data = risk_engine.calculate(
        ocr_confidence=ocr_conf,
        validation_logs=val_logs,
        tampering_overall=tamp_prob,
        face_similarity=face_sim,
        scenario=scenario
    )

    db.query(RiskResult).filter(RiskResult.screening_id == screening_id).delete()

    risk_result = RiskResult(
        screening_id=screening_id,
        risk_score=risk_data["risk_score"],
        risk_level=risk_data["risk_level"],
        risk_factors=risk_data["risk_factors"]
    )
    db.add(risk_result)

    # Update main screening
    screening.risk_score = risk_data["risk_score"]
    screening.risk_level = risk_data["risk_level"]
    screening.status = "ESCALATED" if risk_data["risk_score"] >= 60 else "CLEARED"
    screening.completed_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(screening)

    # 5. Compile cryptographic audit chain block
    update_audit_chain(db, screening, current_user.id)

    db.refresh(risk_result)
    return risk_result

# --- Combined analysis pipeline ---
@router.post("/screenings/{id}/analyze", response_model=ScreeningResponse)
def analyze_full_pipeline(
    id: int,
    scenario: str = Form("genuine"),
    live_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    """
    Executes the entire document analysis pipeline in one API call.
    Uses mock services based on the Demo Mode scenario.
    """
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")

    # Step 1: Extract OCR
    doc = db.query(Document).filter(Document.screening_id == id).first()
    if not doc:
        raise HTTPException(status_code=400, detail="No document uploaded for this screening.")

    ocr_data = ocr_service.extract(doc.file_path, scenario=scenario, doc_type=doc.document_type)
    db.query(OCRResult).filter(OCRResult.screening_id == id).delete()
    ocr_res = OCRResult(
        screening_id=id,
        name=ocr_data["name"],
        document_number=ocr_data["document_number"],
        nationality=ocr_data["nationality"],
        date_of_birth=ocr_data["date_of_birth"],
        gender=ocr_data["gender"],
        expiry_date=ocr_data["expiry_date"],
        confidence=ocr_data["confidence"],
        raw_data=ocr_data["raw_data"]
    )
    db.add(ocr_res)

    # Step 2: Validation
    val_logs = val_service.validate(
        {"expiry_date": ocr_res.expiry_date, "document_number": ocr_res.document_number},
        scenario=scenario
    )
    db.query(ValidationResult).filter(ValidationResult.screening_id == id).delete()
    for log in val_logs:
        rec = ValidationResult(
            screening_id=id,
            field=log["field"],
            status=log["status"],
            message=log["message"]
        )
        db.add(rec)

    # Step 3: Tampering
    tamp_data = tamper_service.analyze(doc.file_path, scenario=scenario)
    db.query(TamperingResult).filter(TamperingResult.screening_id == id).delete()
    tamper_res = TamperingResult(
        screening_id=id,
        photo_replacement_score=tamp_data["photo_replacement_score"],
        text_manipulation_score=tamp_data["text_manipulation_score"],
        stamp_score=tamp_data["stamp_score"],
        metadata_score=tamp_data["metadata_score"],
        overall_probability=tamp_data["overall_probability"]
    )
    db.add(tamper_res)

    # Step 4: Face Verify
    live_path = ""
    if live_file:
        live_ext = os.path.splitext(live_file.filename)[1].lower()
        live_path = os.path.join(settings.UPLOAD_DIRECTORY, f"scr_{id}_live{live_ext}")
        with open(live_path, "wb") as buffer:
            shutil.copyfileobj(live_file.file, buffer)
            
    face_data = face_service.verify(doc.file_path, live_path, scenario=scenario)
    db.query(FaceResult).filter(FaceResult.screening_id == id).delete()
    face_res = FaceResult(
        screening_id=id,
        similarity_score=face_data["similarity_score"],
        match_status=face_data["match_status"]
    )
    db.add(face_res)

    # Step 5: Risk Engine
    risk_data = risk_engine.calculate(
        ocr_confidence=ocr_res.confidence,
        validation_logs=val_logs,
        tampering_overall=tamper_res.overall_probability,
        face_similarity=face_res.similarity_score,
        scenario=scenario
    )
    db.query(RiskResult).filter(RiskResult.screening_id == id).delete()
    risk_res = RiskResult(
        screening_id=id,
        risk_score=risk_data["risk_score"],
        risk_level=risk_data["risk_level"],
        risk_factors=risk_data["risk_factors"]
    )
    db.add(risk_res)

    # Finalize Screening
    screening.risk_score = risk_data["risk_score"]
    screening.risk_level = risk_data["risk_level"]
    screening.status = "ESCALATED" if risk_data["risk_score"] >= 60 else "CLEARED"
    screening.completed_at = datetime.datetime.utcnow()
    db.commit()

    # Step 6: Create blockchain hash record
    update_audit_chain(db, screening, current_user.id)

    db.refresh(screening)
    return screening

# --- Get Screening Detail ---
@router.get("/screenings/{id}", response_model=ScreeningResponse)
def get_screening_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER", "ANALYST"]))
):
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")
    return screening

# --- Screening History (Search, Filter, Sort, Pagination) ---
@router.get("/history", response_model=List[ScreeningResponse])
def get_screening_history(
    search: Optional[str] = None,
    document_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_desc: bool = True,
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER", "ANALYST"]))
):
    query = db.query(Screening).join(OCRResult, isouter=True)

    # Search (fictional name or screening_id or document number)
    if search:
        query = query.filter(
            (Screening.screening_id.ilike(f"%{search}%")) |
            (OCRResult.name.ilike(f"%{search}%")) |
            (OCRResult.document_number.ilike(f"%{search}%"))
        )

    if document_type:
        query = query.filter(Screening.document_type == document_type.upper())
    
    if risk_level:
        query = query.filter(Screening.risk_level == risk_level.upper())
        
    if status:
        query = query.filter(Screening.status == status.upper())

    # Sorting
    if sort_by == "risk_score":
        sort_col = Screening.risk_score
    elif sort_by == "completed_at":
        sort_col = Screening.completed_at
    else:
        sort_col = Screening.created_at
        
    if sort_desc:
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    # Pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    # Masking Document Numbers in History for security compliance
    # (ADMIN can see full numbers, others see masked numbers: e.g. A12345***)
    if current_user.role != "ADMIN":
        for r in results:
            if r.ocr_result and r.ocr_result.document_number:
                num = r.ocr_result.document_number
                if len(num) > 4:
                    r.ocr_result.document_number = num[:5] + "*" * (len(num) - 5)
                else:
                    r.ocr_result.document_number = "*" * len(num)

    return results

# --- Cases Router (High-Risk Case Queue) ---
@router.get("/cases", response_model=List[ScreeningResponse])
def get_escalated_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER", "ANALYST"]))
):
    """
    Returns screenings with high risk levels (HIGH, CRITICAL) or status (ESCALATED, UNDER_REVIEW).
    """
    cases = db.query(Screening).filter(
        (Screening.risk_level.in_(["HIGH", "CRITICAL"])) |
        (Screening.status.in_(["ESCALATED", "UNDER_REVIEW"]))
    ).order_by(Screening.risk_score.desc()).all()
    return cases

@router.put("/cases/{id}/status", response_model=ScreeningResponse)
def update_case_status(
    id: int,
    status_update: ScreeningUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER"]))
):
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Case record not found")

    valid_statuses = ["UNDER_REVIEW", "ESCALATED", "CLEARED", "CLOSED"]
    new_status = status_update.status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    screening.status = new_status
    
    # Audit log entry for resolution
    audit = AuditLog(
        screening_id=id,
        action=f"Case status changed to {new_status} by {current_user.name}",
        user_id=current_user.id,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(screening)
    return screening

# --- PDF Report Download Endpoint ---
@router.get("/screenings/{id}/report")
def download_pdf_report(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "OFFICER", "ANALYST"]))
):
    screening = db.query(Screening).filter(Screening.id == id).first()
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")

    pdf_bytes = ReportGenerator.generate_screening_report(screening, db)

    # Save to report directory for audit trail records
    os.makedirs(settings.UPLOAD_DIRECTORY.replace("uploads", "reports"), exist_ok=True)
    report_path = os.path.join(settings.UPLOAD_DIRECTORY.replace("uploads", "reports"), f"report_{screening.screening_id}.pdf")
    with open(report_path, "wb") as f:
        f.write(pdf_bytes)

    headers = {
        "Content-Disposition": f"attachment; filename=ssb_report_{screening.screening_id}.pdf"
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
