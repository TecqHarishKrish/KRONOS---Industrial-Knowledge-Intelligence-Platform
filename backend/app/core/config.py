import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "KRONOS Industrial Knowledge Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_industrial_key_change_me_in_prod_1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for local development convenience

    # Database
    SQLITE_DB_FILE: str = "data/kronos.db"
    DATABASE_URL: str = f"sqlite:///./{SQLITE_DB_FILE}"

    # File Storage
    UPLOAD_DIR: str = "data/uploads"
    VECTOR_DB_DIR: str = "data/vector_db"

    # OCR
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs("data", exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
