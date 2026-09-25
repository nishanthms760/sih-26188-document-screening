from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/sih_db"
    JWT_SECRET: str = "sih_26188_fake_identity_screening_secret_key_sashastra_seema_bal"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600
    UPLOAD_DIRECTORY: str = "D:/SIH 2026/sih-26188-document-screening/uploads"
    MAX_FILE_SIZE: int = 5242880  # 5 MB
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177,http://127.0.0.1:5178,http://localhost:3000,http://127.0.0.1:3000,https://sih-26188-document-screening-pi.vercel.app"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
