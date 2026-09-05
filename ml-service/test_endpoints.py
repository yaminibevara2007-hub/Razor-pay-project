import sys
import json
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("--- Testing GET /health ---")
response = client.get("/health")
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

print("\n--- Testing POST /predict with VALID input ---")
valid_payload = {
    "amount": 1500.50,
    "payment_method": "credit_card",
    "gateway": "stripe",
    "failure_reason": "insufficient_funds",
    "network_latency": 120,
    "gateway_health": 0.95,
    "issuer_health": 0.88,
    "previous_attempt_count": 1,
    "recent_gateway_success_rate": 0.92,
    "historical_recovery_rate": 0.45,
    "time_since_failure": 3600,
    "customer_action_required": False
}
response = client.post("/predict", json=valid_payload)
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

print("\n--- Testing POST /predict with INVALID input (amount <= 0) ---")
invalid_payload_1 = valid_payload.copy()
invalid_payload_1["amount"] = -10.0
response = client.post("/predict", json=invalid_payload_1)
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

print("\n--- Testing POST /predict with INVALID input (missing field) ---")
invalid_payload_2 = valid_payload.copy()
del invalid_payload_2["payment_method"]
response = client.post("/predict", json=invalid_payload_2)
print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
