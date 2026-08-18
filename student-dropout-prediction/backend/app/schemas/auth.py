"""
Authentication request and response schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    username: str = Field(..., description="Username for authentication")
    password: str = Field(..., description="Password")


class User(BaseModel):
    id: str
    username: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    student_id: Optional[str] = None
    email: str
    role: str = Field("student", description="Role: Admin, Mentor, or Student")
    mentorId: Optional[str] = None
    mentorName: Optional[str] = None
    status: str = "Active"


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


# Backward-compatible aliases for existing code
class UserRegister(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=4, description="User password")
    full_name: str = Field(..., description="Full display name")
    username: Optional[str] = Field(None, description="Username")
    student_id: Optional[str] = Field(None, description="Student ID")
    role: str = Field("student", description="Role")


class UserLogin(BaseModel):
    email_or_student_id: str = Field(..., description="Email or student ID")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    student_id: Optional[str] = None
    role: str
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
