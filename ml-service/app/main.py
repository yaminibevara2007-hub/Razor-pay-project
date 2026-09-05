"""
FastAPI ML Recovery Service
============================
Loads a trained Logistic Regression model and serves recovery probability predictions.

Falls back to a deterministic development predictor ONLY if model file is missing.
"""

from fastapi import FastAPI, HTTPException
from datetime import datetime, timezone
import logging
import os
import json
from pathlib import Path
from typing import Optional

from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictionRequest, PredictionResponse

app = FastAPI(title="ML Recovery Service — AI Revenue Recovery Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

# ─── Model paths ──────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODELS_DIR / "recovery_model.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"

# ─── Load model at startup ────────────────────────────────────────────────────
_pipeline = None
_metadata: dict = {}
_using_trained_model = False


def _load_model():
    global _pipeline, _metadata, _using_trained_model
    try:
        import joblib
        if MODEL_PATH.exists():
            _pipeline = joblib.load(MODEL_PATH)
            _using_trained_model = True
            if METADATA_PATH.exists():
                with open(METADATA_PATH) as f:
                    _metadata = json.load(f)
            logger.info(f"Trained model loaded: {_metadata.get('model_name', 'unknown')} v{_metadata.get('model_version', '?')}")
        else:
            logger.warning(f"No trained model found at {MODEL_PATH}. Using development predictor fallback.")
            _using_trained_model = False
    except Exception as e:
        logger.error(f"Failed to load model: {e}. Using development predictor fallback.")
        _using_trained_model = False


_load_model()

@app.get("/")
def root():
    return {
        "service": "ML Recovery Service",
        "status": "online",
        "health": "/health",
        "model_info": "/model/info",
        "docs": "/docs"
    }


# ─── Health endpoint ──────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "success": True,
        "message": "ML Service is healthy",
        "model": {
            "name": _metadata.get("model_name", "development_predictor"),
            "version": _metadata.get("model_version", "0.1.0"),
            "trained": _using_trained_model,
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ─── Model info endpoint ──────────────────────────────────────────────────────
@app.get("/model/info")
def model_info():
    if not _using_trained_model:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "MODEL_NOT_AVAILABLE",
                "message": "No trained model loaded. Run the training pipeline first.",
                "model_path": str(MODEL_PATH),
            }
        )
    return {
        "model_name":    _metadata.get("model_name"),
        "model_version": _metadata.get("model_version"),
        "training_date": _metadata.get("training_date"),
        "dataset_size":  _metadata.get("dataset_size"),
        "train_size":    _metadata.get("train_size"),
        "test_size":     _metadata.get("test_size"),
        "features":      _metadata.get("features", []),
        "metrics":       _metadata.get("metrics", {}),
        "notice":        _metadata.get("notice", ""),
    }


# ─── Prediction endpoint ──────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    try:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")

        if _using_trained_model and _pipeline is not None:
            # ── Use real trained model ───────────────────────────────────────
            import pandas as pd
            row = pd.DataFrame([{
                "amount":                     request.amount,
                "payment_method":             request.payment_method,
                "gateway":                    request.gateway,
                "failure_reason":             request.failure_reason,
                "network_latency":            request.network_latency,
                "gateway_health":             request.gateway_health,
                "issuer_health":              request.issuer_health,
                "customer_action_required":   int(request.customer_action_required),
                "previous_attempt_count":     request.previous_attempt_count,
                "recent_gateway_success_rate": request.recent_gateway_success_rate,
                "historical_recovery_rate":   request.historical_recovery_rate,
                "time_since_failure":         request.time_since_failure,
            }])
            prob = float(_pipeline.predict_proba(row)[0, 1])
            prob = round(max(0.01, min(0.99, prob)), 4)

            return PredictionResponse(
                recovery_probability=prob,
                model_name=_metadata.get("model_name", "recovery_logistic_regression"),
                model_version=_metadata.get("model_version", "1.0.0"),
            )

        else:
            # ── Development fallback predictor (clearly labelled) ────────────
            prob = request.historical_recovery_rate
            prob -= (request.previous_attempt_count * 0.05)
            prob -= (request.time_since_failure / 3600.0 * 0.01)
            if request.gateway_health > 0.9 and request.issuer_health > 0.9:
                prob += 0.1
            if request.customer_action_required:
                prob -= 0.3
            prob = max(0.01, min(0.99, prob))

            return PredictionResponse(
                recovery_probability=round(prob, 4),
                model_name="development_predictor",
                model_version="0.1.0",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during prediction")
