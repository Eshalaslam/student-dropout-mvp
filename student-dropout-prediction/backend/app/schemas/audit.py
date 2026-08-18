"""
Audit-related schemas (Bias & Privacy).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class FairnessGroupMetrics(BaseModel):
    group: str
    n: int
    recall: Optional[float] = None
    fnr: Optional[float] = None
    fpr: Optional[float] = None
    selectionRate: Optional[float] = None


class FairnessAuditResult(BaseModel):
    attribute: str
    threshold: Optional[float] = None
    overall: FairnessGroupMetrics
    groups: List[FairnessGroupMetrics] = []


class FeatureInfluence(BaseModel):
    feature: str
    sensitive: bool = False
    usedInModel: bool = True
    auditOnly: bool = False


class AccessLogItem(BaseModel):
    id: str
    timestamp: Optional[str] = None
    user: str
    role: str
    action: str
    studentId: Optional[str] = None


class PrivacyDoc(BaseModel):
    content: str
    updated_at: Optional[str] = None
