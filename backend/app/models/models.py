import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="OFFICER") # ADMIN, OFFICER, ANALYST
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    screenings = relationship("Screening", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. SSB-2026-00001
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_type = Column(String(50), nullable=False) # PASSPORT, VISA, NATIONAL_ID, DRIVING_LICENCE, PERMIT, OTHER
    status = Column(String(50), default="UNDER_REVIEW") # NEW, UNDER_REVIEW, ESCALATED, CLEARED, CLOSED
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(50), default="LOW") # LOW, MEDIUM, HIGH, CRITICAL
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="screenings")
    document = relationship("Document", uselist=False, back_populates="screening")
    ocr_result = relationship("OCRResult", uselist=False, back_populates="screening")
    validation_results = relationship("ValidationResult", back_populates="screening")
    tampering_result = relationship("TamperingResult", uselist=False, back_populates="screening")
    face_result = relationship("FaceResult", uselist=False, back_populates="screening")
    risk_result = relationship("RiskResult", uselist=False, back_populates="screening")
    audit_logs = relationship("AuditLog", back_populates="screening")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    file_path = Column(String(255), nullable=False)
    document_type = Column(String(50), nullable=False)
    file_hash = Column(String(64), nullable=False) # SHA-256
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    screening = relationship("Screening", back_populates="document")

class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    name = Column(String(150), nullable=True)
    document_number = Column(String(100), nullable=True)
    nationality = Column(String(100), nullable=True)
    date_of_birth = Column(String(50), nullable=True)
    gender = Column(String(20), nullable=True)
    expiry_date = Column(String(50), nullable=True)
    confidence = Column(Float, default=1.0)
    raw_data = Column(JSON, nullable=True)

    # Relationships
    screening = relationship("Screening", back_populates="ocr_result")

class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    field = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False) # VALID, WARNING, INVALID
    message = Column(Text, nullable=True)

    # Relationships
    screening = relationship("Screening", back_populates="validation_results")

class TamperingResult(Base):
    __tablename__ = "tampering_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    photo_replacement_score = Column(Float, default=0.0)
    text_manipulation_score = Column(Float, default=0.0)
    stamp_score = Column(Float, default=0.0)
    metadata_score = Column(Float, default=0.0)
    overall_probability = Column(Float, default=0.0)

    # Relationships
    screening = relationship("Screening", back_populates="tampering_result")

class FaceResult(Base):
    __tablename__ = "face_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    similarity_score = Column(Float, default=0.0)
    match_status = Column(String(50), nullable=False) # VERIFIED, POSSIBLE_MATCH, MISMATCH

    # Relationships
    screening = relationship("Screening", back_populates="face_result")

class RiskResult(Base):
    __tablename__ = "risk_results"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=False)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    risk_factors = Column(JSON, nullable=True)

    # Relationships
    screening = relationship("Screening", back_populates="risk_result")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id"), nullable=True)
    action = Column(String(150), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    current_hash = Column(String(64), nullable=True) # SHA-256
    previous_hash = Column(String(64), nullable=True) # SHA-256

    # Relationships
    screening = relationship("Screening", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
