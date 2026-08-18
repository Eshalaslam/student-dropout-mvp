"""
Authentication routes — login, logout, current user profile.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from backend.app.schemas.auth import LoginRequest, LoginResponse, User
from backend.app.services.auth_service import AuthService, get_current_user
from backend.app.db.supabase_client import db_service

router = APIRouter()


@router.get("/accounts")
def list_accounts():
    """Public endpoint: return available login accounts (no passwords) for the login page."""
    accounts = []
    users = db_service.get_all_users()
    for u in users:
        if u.get("status") == "Inactive":
            continue
        role = (u.get("role") or "student").lower()
        if role in ("admin", "mentor"):
            accounts.append({
                "username": u.get("username"),
                "name": u.get("full_name") or u.get("name", ""),
                "role": "Admin" if role == "admin" else "Mentor",
            })
    mentors = db_service.get_all_mentors()
    existing_usernames = {a["username"] for a in accounts}
    for m in mentors:
        if m.get("username") in existing_usernames:
            continue
        if m.get("status") == "Inactive":
            continue
        accounts.append({
            "username": m.get("username"),
            "name": m.get("name", ""),
            "role": "Mentor",
        })
    return accounts


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: dict):
    """Register a new user (student or mentor)."""
    email = payload.get("email", "").lower().strip()
    password = payload.get("password", "")
    full_name = payload.get("full_name") or payload.get("name", "")
    student_id = payload.get("student_id")
    username = payload.get("username") or (student_id if student_id else email.split("@")[0])
    role = payload.get("role", "student")

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required.")

    if db_service.get_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email already exists.")

    password_hash = AuthService.hash_password(password)
    user_record = {
        "email": email,
        "password_hash": password_hash,
        "full_name": full_name,
        "username": username,
        "student_id": student_id,
        "role": role,
        "status": "Active"
    }
    user = db_service.create_user(user_record)
    token = AuthService.create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.get("id"),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "name": user.get("full_name"),
            "username": user.get("username"),
            "student_id": user.get("student_id"),
            "role": user.get("role"),
            "status": user.get("status", "Active")
        }
    }


@router.post("/login", response_model=LoginResponse)
def login(payload: dict):
    """Authenticate with username, email, or student_id + password, returns JWT token + user profile."""
    username = payload.get("username") or payload.get("email_or_student_id") or payload.get("email")
    password = payload.get("password")

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifier (username/email/student_id) and password are required."
        )

    user = AuthService.authenticate_user(username, password)
    if not user:
        candidate = db_service.get_user_by_student_id(username) or db_service.get_user_by_email(username)
        if candidate and AuthService.verify_password(password, candidate.get("password_hash", "")):
            user = candidate

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = AuthService.create_access_token(user)
    role = (user.get("role") or "student").lower()
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.get("id", ""),
            "username": user.get("username") or user.get("email", ""),
            "name": user.get("full_name") or user.get("name", ""),
            "full_name": user.get("full_name") or user.get("name", ""),
            "student_id": user.get("student_id"),
            "email": user.get("email", ""),
            "role": "Admin" if role == "admin" else "Mentor" if role == "mentor" else role,
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
        role = (current_user.get("role") or "student").lower()
        return {
            "id": current_user.get("id", ""),
            "username": username,
            "name": current_user.get("name", ""),
            "email": username,
            "role": "Admin" if role == "admin" else "Mentor" if role == "mentor" else role,
            "mentorId": current_user.get("mentorId"),
            "mentorName": current_user.get("mentorName"),
            "status": current_user.get("status", "Active"),
        }

    role = (user.get("role") or "student").lower()
    return {
        "id": user.get("id", ""),
        "username": user.get("username"),
        "name": user.get("full_name") or user.get("name", ""),
        "email": user.get("email", ""),
        "role": "Admin" if role == "admin" else "Mentor" if role == "mentor" else role,
        "mentorId": user.get("mentor_id"),
        "mentorName": user.get("mentor_name"),
        "status": user.get("status", "Active"),
    }
