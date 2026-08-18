"""
Authentication and token management service.
Handles secure password hashing with bcrypt, JWT issuance and validation.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from backend.app.db.supabase_client import db_service

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

JWT_SECRET = os.getenv("JWT_SECRET", "supersecret-student-dropout-jwt-key-2026-hackathon")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))

security_bearer = HTTPBearer(auto_error=False)


class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password with bcrypt."""
        pwd_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against the stored bcrypt hash."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    @staticmethod
    def create_access_token(user_data: Dict[str, Any]) -> str:
        """Create a signed JWT token containing user identity and role."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
        payload = {
            "sub": user_data.get("username") or user_data.get("email", ""),
            "id": user_data.get("id"),
            "role": user_data.get("role", "student"),
            "mentorId": user_data.get("mentor_id"),
            "mentorName": user_data.get("mentor_name"),
            "name": user_data.get("full_name") or user_data.get("name", ""),
            "status": user_data.get("status", "Active"),
            "exp": expire,
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
                detail="Token has expired. Please log in again.",
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token credentials.",
            )

    @classmethod
    def authenticate_user(cls, username: str, password: str) -> Dict[str, Any]:
        """Verify login credentials by username. Checks users table, then mentors table."""
        uname = username.strip()

        # Check users table first
        user = db_service.get_user_by_username(uname)
        if user and cls.verify_password(password, user["password_hash"]):
            return user

        # Check mentors table
        mentor = db_service.get_mentor_by_username(uname)
        if mentor and cls.verify_password(password, mentor["password_hash"]):
            # Return a user-like dict for JWT creation
            return {
                "id": mentor.get("id"),
                "email": mentor.get("email", ""),
                "full_name": mentor.get("name", ""),
                "username": mentor.get("username"),
                "role": "Mentor",
                "mentor_id": mentor.get("mentor_id"),
                "mentor_name": mentor.get("name"),
                "status": mentor.get("status", "Active"),
                "password_hash": mentor["password_hash"],
            }

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    @classmethod
    def register_user(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Register a new user in database."""
        email = data["email"].lower().strip()
        existing = db_service.get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists.",
            )

        username = data.get("username")
        if username:
            existing_uname = db_service.get_user_by_username(username)
            if existing_uname:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this username already exists.",
                )

        password_hash = cls.hash_password(data["password"])
        record = {
            "email": email,
            "password_hash": password_hash,
            "full_name": data["full_name"],
            "student_id": data.get("student_id"),
            "role": data.get("role", "student"),
            "username": username,
            "mentor_id": data.get("mentor_id"),
            "mentor_name": data.get("mentor_name"),
            "status": data.get("status", "Active"),
        }

        user = db_service.create_user(record)
        return user


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Optional[Dict[str, Any]]:
    """FastAPI dependency to extract current user from Authorization header."""
    if not credentials:
        return None
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    return payload


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> Dict[str, Any]:
    """FastAPI dependency that requires authentication."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide Authorization: Bearer <token>",
        )
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    return payload


def require_admin(
    current_user: Dict[str, Any] = Security(require_auth),
) -> Dict[str, Any]:
    """FastAPI dependency that requires Admin role (case-insensitive)."""
    role = (current_user.get("role") or "").lower()
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def require_mentor(
    current_user: Dict[str, Any] = Security(require_auth),
) -> Dict[str, Any]:
    """FastAPI dependency that requires Mentor or Admin role (case-insensitive)."""
    role = (current_user.get("role") or "").lower()
    if role not in ("mentor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mentor or Admin access required.",
        )
    return current_user
