from pydantic import BaseModel


class Diagnosis(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    kubectl_command: str
    prevention: str
    confidence: int


class ClusterDiagnosis(BaseModel):
    root_cause: str
    suggested_fix: str
