"""
Dashboard-related schemas.
"""
from pydantic import BaseModel
from typing import Optional, List


class DashboardStats(BaseModel):
    total_students: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    active_interventions: int


class RiskDistribution(BaseModel):
    high: int
    medium: int
    low: int


class DepartmentRisk(BaseModel):
    department: str
    average_risk_percentage: float


class RiskDriverStat(BaseModel):
    factor: str
    count: int
