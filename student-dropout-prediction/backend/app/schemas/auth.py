"""
Authentication request and response schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional


class UserRegister(BaseModel):
    email: str = Field(..., description="Student or staff email address")
    password: str = Field(..., min_length=4, description="User password")
    full_name: str = Field(..., description="Full display name")
    student_id: Optional[str] = Field(None, description="Unique student ID code (e.g. STU10432)")
    role: str = Field("student", description="Role: 'student' or 'mentor'")


class UserLogin(BaseModel):
    email_or_student_id: str = Field(..., description="Email address or student ID")
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
