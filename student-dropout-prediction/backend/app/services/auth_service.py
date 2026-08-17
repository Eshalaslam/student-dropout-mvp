"""
Authentication and token management service.
Handles secure password hashing, JWT issuance and validation.
"""
import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from backend.app.db.supabase_client import db_service

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret-student-dropout-jwt-key-2026-hackathon")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))

security_bearer = HTTPBearer(auto_error=False)


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password with PBKDF2-HMAC-SHA256 and unique salt."""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
        ).hex()
        return f"{salt}${pwd_hash}"

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against the stored salt$hash."""
        try:
            salt, stored_hash = hashed_password.split("$")
            computed_hash = hashlib.pbkdf2_hmac(
                "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100_000
            ).hex()
            return secrets.compare_digest(stored_hash, computed_hash)
        except Exception:
            return False

    @staticmethod
    def create_access_token(user_data: Dict[str, Any]) -> str:
        """Create a signed JWT token containing user identity and role."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
        payload = {
            "sub": user_data["email"],
            "id": user_data.get("id"),
            "student_id": user_data.get("student_id"),
            "full_name": user_data.get("full_name"),
            "role": user_data.get("role", "student"),
            "exp": expire
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please log in again."
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials."
            )

    @classmethod
    def register_user(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new user in database."""
        email = data["email"].lower().strip()
        existing = db_service.get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

        student_id = data.get("student_id")
        if student_id:
            existing_sid = db_service.get_user_by_student_id(student_id)
            if existing_sid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Student ID '{student_id}' is already registered."
                )
        else:
            # Auto-assign student ID for student accounts if not provided
            if data.get("role", "student") == "student":
                student_id = f"STU{secrets.randbelow(90000) + 10000}"

        password_hash = cls.hash_password(data["password"])
        record = {
            "email": email,
            "password_hash": password_hash,
            "full_name": data["full_name"],
            "student_id": student_id,
            "role": data.get("role", "student")
        }

        user = db_service.create_user(record)
        return user

    @classmethod
    def authenticate_user(cls, email_or_student_id: str, password: str) -> Dict[str, Any]:
        """Verify login credentials for student or mentor."""
        identifier = email_or_student_id.strip()
        user = db_service.get_user_by_email(identifier)
        if not user:
            user = db_service.get_user_by_student_id(identifier)

        if not user or not cls.verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/student ID or password."
            )

        return user


# Seed sample users for immediate zero-friction evaluation
def seed_demo_users():
    if not db_service.get_user_by_email("student@campus.edu"):
        AuthService.register_user({
            "email": "student@campus.edu",
            "password": "password123",
            "full_name": "Alex Johnson",
            "student_id": "STU10432",
            "role": "student"
        })
    if not db_service.get_user_by_email("mentor@campus.edu"):
        AuthService.register_user({
            "email": "mentor@campus.edu",
            "password": "password123",
            "full_name": "Dr. Sarah Mitchell",
            "student_id": None,
            "role": "mentor"
        })


seed_demo_users()


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> Optional[Dict[str, Any]]:
    """FastAPI dependency to extract current user from Authorization header."""
    if not credentials:
        return None
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    return payload
