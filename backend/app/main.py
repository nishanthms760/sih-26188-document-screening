import os
import datetime
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.connection import engine, Base, SessionLocal
from app.models.models import User
from app.api import auth, screenings, analytics, audit

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

# Ensure demo users exist (idempotent)
try:
    from app.database.seed import ensure_demo_users
    ensure_demo_users()
except Exception as e:
    print(f"Demo user creation error: {e}")

app = FastAPI(
    title="AI-Based Fake Identity & Document Screening System",
    description="Ministry of Home Affairs - Smart India Hackathon 2026 Problem Statement 26188",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Setup
origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

origins.extend([
    "https://sih-26188-document-screening-pi.vercel.app"
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create folders for uploads and reports if they don't exist
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.UPLOAD_DIRECTORY.replace("uploads", "reports"), exist_ok=True)

# Serve files for demonstration previews
app.mount("/api/static/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")

# Error handling mapping
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An internal server error occurred: {str(exc)}"}
    )

# Register routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(screenings.router, prefix="/api", tags=["Screenings"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit Trail"])

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "SSB Screening API",
        "system": "SSB Identity Screening Command Center Backend",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
