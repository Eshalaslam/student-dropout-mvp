"""
Mentor-related schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional


class MentorProfile(BaseModel):
    id: Optional[str] = None
    username: str
    name: str
    email: Optional[str] = None
    role: str = "Mentor"
    mentorId: Optional[str] = None
    status: str = "Active"  # Active, Inactive
    assigned_students_count: int = 0


class MentorCreateRequest(BaseModel):
    name: str = Field(..., description="Mentor's full name")
    username: str = Field(..., description="Unique username")
    password: str = Field(..., description="Password for login")
    mentorId: Optional[str] = Field(None, description="Custom mentor ID")
    email: Optional[str] = Field(None, description="Email address")
