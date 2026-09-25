import datetime
import hashlib
import json
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal, Base, engine
from app.models.models import User, Screening, Document, OCRResult, ValidationResult, TamperingResult, FaceResult, RiskResult, AuditLog
from app.core.security import get_password_hash

def compute_hash(data_str: str) -> str:
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()

def seed_db():
    # 1. Create tables
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 2. Create users
        print("Creating users...")
        users_data = [
            {"name": "Admin Officer", "email": "admin@ssb.gov.in", "password": "admin123", "role": "ADMIN"},
            {"name": "Security Officer", "email": "officer@ssb.gov.in", "password": "officer123", "role": "OFFICER"},
            {"name": "Intelligence Analyst", "email": "analyst@ssb.gov.in", "password": "analyst123", "role": "ANALYST"}
        ]
        
        users = []
        for u in users_data:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=get_password_hash(u["password"]),
                role=u["role"]
            )
            db.add(user)
            users.append(user)
        db.commit()
        for u in users:
            db.refresh(u)

        officer_id = users[1].id # Default screening officer
        
        # Fictional profiles lists
        low_risk_profiles = [
            {"name": "Aarav Sharma", "num": "Z8765432", "nat": "INDIAN", "dob": "12/03/1995", "expiry": "12/03/2035", "gender": "M", "type": "PASSPORT", "score": 12, "level": "LOW"},
            {"name": "Vikram Singh", "num": "N1234567", "nat": "INDIAN", "dob": "28/08/1988", "expiry": "28/08/2032", "gender": "M", "type": "PASSPORT", "score": 8, "level": "LOW"},
            {"name": "Priya Patel", "num": "S9876543", "nat": "INDIAN", "dob": "15/07/1993", "expiry": "15/07/2033", "gender": "F", "type": "PASSPORT", "score": 15, "level": "LOW"},
            {"name": "Amit Kumar", "num": "DL-12023049", "nat": "INDIAN", "dob": "02/01/1990", "expiry": "02/01/2040", "gender": "M", "type": "DRIVING_LICENCE", "score": 5, "level": "LOW"},
            {"name": "Neha Gupta", "num": "NID-9923881", "nat": "INDIAN", "dob": "19/11/1996", "expiry": "19/11/2036", "gender": "F", "type": "NATIONAL_ID", "score": 18, "level": "LOW"},
            {"name": "Siddharth Rao", "num": "A9821388", "nat": "INDIAN", "dob": "22/04/1991", "expiry": "22/04/2031", "gender": "M", "type": "PASSPORT", "score": 14, "level": "LOW"},
            {"name": "Ananya Iyer", "num": "P3382910", "nat": "INDIAN", "dob": "07/10/1997", "expiry": "07/10/2037", "gender": "F", "type": "PASSPORT", "score": 9, "level": "LOW"},
            {"name": "Rahul Verma", "num": "V3892019", "nat": "INDIAN", "dob": "11/02/1985", "expiry": "11/02/2035", "gender": "M", "type": "PASSPORT", "score": 22, "level": "LOW"},
            {"name": "Karan Malhotra", "num": "DL-9920399", "nat": "INDIAN", "dob": "05/09/1989", "expiry": "05/09/2039", "gender": "M", "type": "DRIVING_LICENCE", "score": 11, "level": "LOW"},
            {"name": "Meera Nair", "num": "NID-2281903", "nat": "INDIAN", "dob": "30/06/1994", "expiry": "30/06/2034", "gender": "F", "type": "NATIONAL_ID", "score": 16, "level": "LOW"}
        ]

        suspicious_profiles = [
            {"name": "Donald Miller", "num": "V87654321", "nat": "AMERICAN", "dob": "25/08/1992", "expiry": "15/12/2026", "gender": "M", "type": "VISA", "score": 54, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Sophia Dubois", "num": "F8877221", "nat": "FRENCH", "dob": "09/12/1990", "expiry": "09/12/2028", "gender": "F", "type": "PASSPORT", "score": 42, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Chen Wei", "num": "P3399002", "nat": "CHINESE", "dob": "01/01/1985", "expiry": "01/01/2027", "gender": "M", "type": "PASSPORT", "score": 48, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Amara Okafor", "num": "V2299881", "nat": "NIGERIAN", "dob": "14/05/1994", "expiry": "14/05/2028", "gender": "F", "type": "VISA", "score": 58, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Yuki Tanaka", "num": "J3892019", "nat": "JAPANESE", "dob": "03/11/1993", "expiry": "03/11/2030", "gender": "F", "type": "PASSPORT", "score": 38, "level": "MEDIUM", "status": "CLEARED"}
        ]

        # 5 additional suspicious/medium risk to total 10 medium/suspicious
        extra_suspicious_profiles = [
            {"name": "Hans Muller", "num": "G8829103", "nat": "GERMAN", "dob": "15/05/1987", "expiry": "15/05/2029", "gender": "M", "type": "PASSPORT", "score": 45, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Fatima Al-Sayed", "num": "V9982711", "nat": "EGYPTIAN", "dob": "21/09/1991", "expiry": "21/09/2027", "gender": "F", "type": "VISA", "score": 52, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Yuri Volkov", "num": "R3892018", "nat": "RUSSIAN", "dob": "08/04/1984", "expiry": "08/04/2029", "gender": "M", "type": "PASSPORT", "score": 49, "level": "MEDIUM", "status": "UNDER_REVIEW"},
            {"name": "Li Na", "num": "V3382910", "nat": "CHINESE", "dob": "12/12/1995", "expiry": "12/12/2028", "gender": "F", "type": "VISA", "score": 35, "level": "MEDIUM", "status": "CLEARED"},
            {"name": "John Miller", "num": "A9827182", "nat": "CANADIAN", "dob": "04/07/1989", "expiry": "04/07/2029", "gender": "M", "type": "PASSPORT", "score": 39, "level": "MEDIUM", "status": "CLEARED"}
        ]

        critical_profiles = [
            {"name": "ALAN TURING", "num": "B9999999X", "nat": "BRITISH", "dob": "23/06/1912", "expiry": "10/10/2020", "gender": "M", "type": "PASSPORT", "score": 91, "level": "CRITICAL", "status": "ESCALATED"},
            {"name": "Impersonator Doe", "num": "A12345678", "nat": "INDIAN", "dob": "12/03/1998", "expiry": "12/03/2035", "gender": "M", "type": "PASSPORT", "score": 85, "level": "HIGH", "status": "ESCALATED"},
            {"name": "Carlos Estavez", "num": "V12983772", "nat": "MEXICAN", "dob": "18/02/1980", "expiry": "18/02/2025", "gender": "M", "type": "VISA", "score": 88, "level": "CRITICAL", "status": "ESCALATED"}
        ]

        all_profiles = []
        for p in low_risk_profiles:
            p["status"] = "CLEARED"
            all_profiles.append(p)
        for p in suspicious_profiles:
            all_profiles.append(p)
        for p in extra_suspicious_profiles:
            all_profiles.append(p)
        for p in critical_profiles:
            all_profiles.append(p)

        print(f"Seeding {len(all_profiles)} screenings...")
        
        previous_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        for idx, prof in enumerate(all_profiles):
            screening_num = f"SSB-2026-{idx+1:05d}"
            
            # Create screening
            created_at = datetime.datetime.utcnow() - datetime.timedelta(days=(25 - idx), hours=idx)
            completed_at = created_at + datetime.timedelta(seconds=12 + (idx % 8))
            
            screening = Screening(
                screening_id=screening_num,
                user_id=officer_id,
                document_type=prof["type"],
                status=prof["status"],
                risk_score=prof["score"],
                risk_level=prof["level"],
                created_at=created_at,
                completed_at=completed_at
            )
            db.add(screening)
            db.commit()
            db.refresh(screening)
            
            # Create document
            doc = Document(
                screening_id=screening.id,
                file_path=f"uploads/{screening_num}_document.png",
                document_type=prof["type"],
                file_hash=compute_hash(f"fake_file_content_{screening_num}"),
                uploaded_at=created_at
            )
            db.add(doc)
            
            # Create OCR
            raw_data = {"issuing_state": prof["nat"][:3], "class": "Regular"}
            ocr = OCRResult(
                screening_id=screening.id,
                name=prof["name"],
                document_number=prof["num"],
                nationality=prof["nationality"] if "nationality" in prof else prof["nat"],
                date_of_birth=prof["dob"],
                gender=prof["gender"],
                expiry_date=prof["expiry"],
                confidence=0.98 if prof["level"] == "LOW" else (0.92 if prof["level"] == "MEDIUM" else 0.74),
                raw_data=raw_data
            )
            db.add(ocr)
            
            # Validation results
            val1 = ValidationResult(
                screening_id=screening.id,
                field="Document Number",
                status="VALID",
                message="Matches standard format validation rules."
            )
            val2 = ValidationResult(
                screening_id=screening.id,
                field="Expiry Date",
                status="INVALID" if prof["score"] >= 88 and prof["name"] != "Impersonator Doe" else "VALID",
                message="Expired" if prof["score"] >= 88 and prof["name"] != "Impersonator Doe" else "Valid active date."
            )
            db.add(val1)
            db.add(val2)
            
            # Tampering results
            tamper = TamperingResult(
                screening_id=screening.id,
                photo_replacement_score=0.01 if prof["level"] == "LOW" else (0.15 if prof["level"] == "MEDIUM" else 0.85),
                text_manipulation_score=0.03 if prof["level"] == "LOW" else (0.18 if prof["level"] == "MEDIUM" else 0.92),
                stamp_score=0.01 if prof["level"] == "LOW" else (0.05 if prof["level"] == "MEDIUM" else 0.15),
                metadata_score=0.02 if prof["level"] == "LOW" else (0.02 if prof["level"] == "MEDIUM" else 0.40),
                overall_probability=0.05 if prof["level"] == "LOW" else (0.18 if prof["level"] == "MEDIUM" else 0.88)
            )
            db.add(tamper)
            
            # Face results
            face = FaceResult(
                screening_id=screening.id,
                similarity_score=0.98 if prof["level"] == "LOW" else (0.85 if prof["level"] == "MEDIUM" else 0.32),
                match_status="VERIFIED" if prof["level"] == "LOW" else ("POSSIBLE_MATCH" if prof["level"] == "MEDIUM" else "MISMATCH")
            )
            db.add(face)
            
            # Risk results
            risk_factors = [
                {"factor": "Tampering Forensic Score Contribution", "change": int(tamper.overall_probability * 40)},
                {"factor": "Face Similarity Match Confidence", "change": 0 if face.match_status == "VERIFIED" else (10 if face.match_status == "POSSIBLE_MATCH" else 25)}
            ]
            risk = RiskResult(
                screening_id=screening.id,
                risk_score=prof["score"],
                risk_level=prof["level"],
                risk_factors=risk_factors
            )
            db.add(risk)
            
            db.commit()

            # Cryptographic Hash Chain creation
            action = f"Screening {screening_num} finalized"
            timestamp_str = completed_at.isoformat()
            
            # Chain block content: screening_id + action + timestamp + user_id + risk_score + previous_hash
            block_data = f"{screening.id}|{action}|{timestamp_str}|{officer_id}|{prof['score']}|{previous_hash}"
            current_hash = compute_hash(block_data)
            
            audit = AuditLog(
                screening_id=screening.id,
                action=action,
                user_id=officer_id,
                timestamp=completed_at,
                current_hash=current_hash,
                previous_hash=previous_hash
            )
            db.add(audit)
            db.commit()
            
            previous_hash = current_hash # Pass down the chain
            
        print("Database successfully seeded with 23 fictional screenings and hash chain!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
