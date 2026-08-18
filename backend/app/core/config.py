"""
PrivacyGuard AI Configuration Module
Enforces strict Zero-Retention memory-only processing and local offline risk evaluation.
Configures Google Gemini API settings for Contextual Privacy Copilot.
"""

import os
from typing import Dict, List
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
load_dotenv()  # Fallback to current working directory


class Settings(BaseModel):
    PROJECT_NAME: str = "PrivacyGuard AI"
    VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Gemini API Configuration (supports single key or comma-separated list of keys for auto-failover)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_API_KEYS: str = os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    
    def get_api_keys(self) -> List[str]:
        """Returns clean list of all configured Gemini API keys."""
        all_keys_raw = f"{self.GEMINI_API_KEYS},{self.GEMINI_API_KEY}"
        keys = []
        for k in all_keys_raw.split(","):
            clean_k = k.strip()
            if clean_k and clean_k not in keys:
                keys.append(clean_k)
        return keys
    
    # Zero-Retention: strictly prohibit saving raw uploaded files to persistent storage
    ZERO_RETENTION_MODE: bool = True
    
    # In-memory buffer size limit (e.g. 25 MB max per file)
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024
    
    ALLOWED_EXTENSIONS: List[str] = [
        "pdf", "png", "jpg", "jpeg", "webp", "tiff", "txt", "csv", "json", "doc", "docx"
    ]
    
    # Risk Score Weights for different PII categories (contributes to 0-100 risk score)
    PII_WEIGHTS: Dict[str, int] = {
        "AADHAAR": 35,
        "AADHAAR_VID": 30,
        "PAN": 30,
        "CREDIT_CARD": 35,
        "SSN": 35,
        "PASSPORT": 25,
        "PHONE_NUMBER": 15,
        "EMAIL": 10,
        "IP_ADDRESS": 8,
        "API_KEY": 30,
        "DATE_OF_BIRTH": 12,
        "FINANCIAL_ACCOUNT": 28,
        "GENERIC_NAME": 5
    }
    
    # Risk Classifications based on composite score
    RISK_THRESHOLDS: Dict[str, float] = {
        "CRITICAL": 70.0,
        "HIGH": 45.0,
        "MEDIUM": 20.0,
        "LOW": 0.0
    }
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "*"
    ]


settings = Settings()
