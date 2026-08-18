"""
Authentication routes — login, logout, current user profile.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.schemas.auth import LoginRequest, LoginResponse, User
from backend.app.services.auth_service import AuthService, get_current_user
from backend.app.db.supabase_client import db_service

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """Authenticate with username + password, returns JWT token + user profile."""
    user = AuthService.authenticate_user(payload.username, payload.password)
    token = AuthService.create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.get("id", ""),
            "username": user.get("username"),
            "name": user.get("full_name") or user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "student"),
            "mentorId": user.get("mentor_id"),
            "mentorName": user.get("mentor_name"),
            "status": user.get("status", "Active"),
        },
    }


@router.post("/logout")
def logout():
    """Logout — JWT is stateless; client discards the token."""
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide Authorization: Bearer <token>",
        )

    username = current_user.get("sub", "")
    user = db_service.get_user_by_username(username)
    if not user:
        user = db_service.get_user_by_email(username)

    if not user:
        return {
            "id": current_user.get("id", ""),
            "username": username,
            "name": current_user.get("name", ""),
            "email": username,
            "role": current_user.get("role", "student"),
            "mentorId": current_user.get("mentorId"),
            "mentorName": current_user.get("mentorName"),
            "status": current_user.get("status", "Active"),
        }

    return {
        "id": user.get("id", ""),
        "username": user.get("username"),
        "name": user.get("full_name") or user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "student"),
        "mentorId": user.get("mentor_id"),
        "mentorName": user.get("mentor_name"),
        "status": user.get("status", "Active"),
    }
