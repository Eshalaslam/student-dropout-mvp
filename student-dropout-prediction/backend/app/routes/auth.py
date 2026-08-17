"""
Authentication routes for student and mentor registration/login.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from backend.app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from backend.app.services.auth_service import AuthService, get_current_user
from backend.app.db.supabase_client import db_service

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister):
    """Register a new student or academic mentor."""
    user = AuthService.register_user(payload.model_dump())
    token = AuthService.create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "student_id": user.get("student_id"),
            "role": user["role"],
            "created_at": user.get("created_at")
        }
    }


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin):
    """Log in as a student or mentor using email/student_id and password."""
    user = AuthService.authenticate_user(payload.email_or_student_id, payload.password)
    token = AuthService.create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "student_id": user.get("student_id"),
            "role": user["role"],
            "created_at": user.get("created_at")
        }
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: Optional[dict] = Depends(get_current_user)):
    """Get the currently logged-in user profile."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide Authorization: Bearer <token>"
        )
    user = db_service.get_user_by_email(current_user["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User record not found."
        )
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "student_id": user.get("student_id"),
        "role": user["role"],
        "created_at": user.get("created_at")
    }
