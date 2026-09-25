# MHA Border Intelligence: AI-Based Fake Identity & Document Screening System
### Smart India Hackathon 2026 — Problem Statement 26188 (Ministry of Home Affairs / Sashastra Seema Bal)

An advanced, full-stack intelligence and document verification system designed for checkpoint operations. This platform screens travel and identity documents, performs forensic forgery analysis, matches face biometrics, calculates risk profiles, and records cryptographically chained audit trails.

---

## 1. Project Overview & Problem Statement

At border checkpoints and security areas, identifying counterfeit travel papers (passports, visas, permits) under high passenger traffic is a critical security challenge. The main objectives of this system are to detect:
* **Fake/Forged Passports & Visas**: Invalid formatting, expired terms, blacklisted profiles.
* **Tampered Information**: Photo replacements, date-of-birth modifications, and stamp overlays.
* **Identity Impersonation**: Mismatch between document holder and traveler biometrics.
* **Incomplete Digital Audit Trails**: Ensuring security decisions cannot be altered.

---

## 2. Technology Stack

* **Frontend**: React (Vite), TypeScript, Tailwind CSS, Framer Motion, Lucide icons, Recharts (for dashboards), React Hook Form, Zod.
* **Backend**: Python, FastAPI, SQLAlchemy ORM, Pydantic data validation.
* **Database**: PostgreSQL (Production) / SQLite (Local Fallback for demo portability).
* **Security & Auth**: JWT (JSON Web Tokens), BCrypt password hashing.
* **Report Generation**: ReportLab PDF generator.

---

## 3. System Architecture & AI Pipeline

```
[Uploaded Document Image] 
         │
         ▼
[Step 1: OCR Extraction] ───────► Extracted Name, Expiry, Nationality, DOB (with confidence)
         │
         ▼
[Step 2: Document Validation] ──► Format check, MRZ checksum calculations, Expiry dates
         │
         ▼
[Step 3: Tampering Detection] ──► ELA Analysis, Photo replacement frame checking, Font mismatches
         │
         ▼
[Step 4: Face Verification] ────► Comparison of extracted document photo with live traveler photo
         │
         ▼
[Step 5: Risk Engine] ──────────► Weighs all features (0-100 score) into LOW, MEDIUM, HIGH, CRITICAL
         │
         ▼
[Step 6: Cryptographic Audit] ──► Generates block in the local SHA-256 hash chain
```

---

## 4. Database Schema

The database consists of the following key tables:
* **users**: User account credentials and roles (ADMIN, OFFICER, ANALYST).
* **screenings**: Core screening logs representing traveler screening attempts.
* **documents**: Uploaded document references, MIME type validations, and SHA-256 file hashes.
* **ocr_results**: Extracted text properties and reading confidence scores.
* **validation_results**: Structured check outcomes for individual document fields.
* **tampering_results**: Forensic scores indicating photo/text/stamp tampering likelihoods.
* **face_results**: Biometric matching outputs and facial similarity percentages.
* **risk_results**: Aggregated risk calculations and associated risk factors.
* **audit_logs**: Immutable audit log entries containing cryptographic hash chain blocks.

---

## 5. Security Architecture

1. **Role-Based Access Control (RBAC)**:
   * **ADMIN**: Full dashboard metrics, analytics, settings, audit trails, and user configuration.
   * **OFFICER**: Performs screenings, uploads documents, runs verification flows, views history.
   * **ANALYST**: Deep dive view into analytics, audit chain integrity verification, case studies.
2. **Cryptographic Hash Chain**:
   Every screening generates an audit log entry. The hash is calculated as:
   `SHA256(screening_id + action + timestamp + user_id + risk_score + previous_block_hash)`
   This creates an immutable history chain. If any record is modified, the hash verification fails.
3. **Data Masking**:
   Officers and Analysts see masked document numbers (e.g. `A12345****`) to protect passenger privacy, while Admins can view complete numbers.

---

## 6. Installation & Execution Guide

### Prerequisites
* Python 3.10+
* Node.js 18+

### Database Fallback Strategy
By default, the backend checks for PostgreSQL on port 5432. If PostgreSQL is not running or psycopg2 dependencies are not found, the system **automatically falls back** to a local SQLite database file `sih_db.db` in the backend root directory. This allows the system to work out-of-the-box on local dev machines without database installations.

### Setup and Running (Local Dev Mode)

#### 1. Backend Setup
1. Open a terminal in the `backend` folder.
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install package dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment variables:
   ```bash
   copy .env.example .env
   ```
5. Seed the database with SIH Demo Scenarios and users:
   ```bash
   python app/database/seed.py
   ```
6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Swagger API Documentation will be available at: http://localhost:8000/docs*

#### 2. Frontend Setup
1. Open another terminal in the `frontend` folder.
2. Install Node modules (if not already installed):
   ```bash
   npm install
   ```
3. Start the Vite React app:
   ```bash
   npm run dev
   ```
4. Access the web app at: http://localhost:5173

---

## 7. Docker Setup (Containerized Run)

To run the entire stack including Frontend, Backend, and PostgreSQL database, run:
```bash
docker-compose up --build
```
This launches:
* **PostgreSQL Database** on port 5432
* **FastAPI Backend** on port 8000
* **React Frontend** on port 5173

---

## 8. Demo Credentials & Test Scenarios

### Officer Login Credentials
* **Admin**: `admin@ssb.gov.in` / Password: `admin123`
* **Officer**: `officer@ssb.gov.in` / Password: `officer123`
* **Analyst**: `analyst@ssb.gov.in` / Password: `analyst123`

### SIH Demonstration Scenarios (Selectable in Screening Workflows)
1. **Scenario 1 — Genuine Document**:
   * *Output*: LOW RISK (18/100 score). Valid MRZ, no tampering detected, face biometrics verified.
2. **Scenario 2 — Suspicious Document**:
   * *Output*: MEDIUM RISK (54/100 score). Visa duration inconsistency warning, face verify possible match.
3. **Scenario 3 — Fake/Tampered Document**:
   * *Output*: CRITICAL RISK (91/100 score). Expired document, high tampering probability (photo replacement and font mismatch), face verify mismatch.
