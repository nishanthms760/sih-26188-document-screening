from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "OFFICER"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str  # Email/username
    password: str

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    file_path: str
    document_type: str
    file_hash: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- OCR Schemas ---
class OCRResultResponse(BaseModel):
    id: int
    name: Optional[str] = None
    document_number: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    expiry_date: Optional[str] = None
    confidence: float
    raw_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# --- Validation Schemas ---
class ValidationResultResponse(BaseModel):
    id: int
    field: str
    status: str # VALID, WARNING, INVALID
    message: Optional[str] = None

    class Config:
        from_attributes = True

# --- Tampering Schemas ---
class TamperingResultResponse(BaseModel):
    id: int
    photo_replacement_score: float
    text_manipulation_score: float
    stamp_score: float
    metadata_score: float
    overall_probability: float

    class Config:
        from_attributes = True

# --- Face Schemas ---
class FaceResultResponse(BaseModel):
    id: int
    similarity_score: float
    match_status: str

    class Config:
        from_attributes = True

# --- Risk Schemas ---
class RiskResultResponse(BaseModel):
    id: int
    risk_score: int
    risk_level: str
    risk_factors: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

# --- Audit Log Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    action: str
    timestamp: datetime
    current_hash: Optional[str] = None
    previous_hash: Optional[str] = None
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Screening Schemas ---
class ScreeningResponse(BaseModel):
    id: int
    screening_id: str
    document_type: str
    status: str
    risk_score: int
    risk_level: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    user: Optional[UserResponse] = None
    document: Optional[DocumentResponse] = None
    ocr_result: Optional[OCRResultResponse] = None
    validation_results: Optional[List[ValidationResultResponse]] = None
    tampering_result: Optional[TamperingResultResponse] = None
    face_result: Optional[FaceResultResponse] = None
    risk_result: Optional[RiskResultResponse] = None
    audit_logs: Optional[List[AuditLogResponse]] = None

    class Config:
        from_attributes = True

class ScreeningCreate(BaseModel):
    document_type: str

class ScreeningUpdate(BaseModel):
    status: str

# --- Case Schemas ---
class CaseStatusUpdate(BaseModel):
    status: str

# --- Dashboard & Analytics Schemas ---
class DashboardStats(BaseModel):
    total_screened: int
    valid_count: int
    suspicious_count: int
    high_risk_count: int
    avg_screening_time: float # in seconds
    face_failures: int

class AnalyticsTrendItem(BaseModel):
    date: str
    total: int
    suspicious: int
    high_risk: int

class RiskDistribution(BaseModel):
    low: int
    medium: int
    high: int
    critical: int

class DocumentTypeStats(BaseModel):
    passport: int
    visa: int
    national_id: int
    driving_licence: int
    permit: int
    other: int

class AnalyticsDashboard(BaseModel):
    stats: DashboardStats
    trend: List[AnalyticsTrendItem]
    risk_distribution: RiskDistribution
    document_distribution: DocumentTypeStats
