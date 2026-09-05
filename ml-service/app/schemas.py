from pydantic import BaseModel
from typing import Optional

class PredictionRequest(BaseModel):
    amount: float
    payment_method: str
    gateway: str
    failure_reason: str
    network_latency: int
    gateway_health: float
    issuer_health: float
    previous_attempt_count: int
    recent_gateway_success_rate: float
    historical_recovery_rate: float
    time_since_failure: int
    customer_action_required: bool

class PredictionResponse(BaseModel):
    recovery_probability: float
    model_name: str
    model_version: str
