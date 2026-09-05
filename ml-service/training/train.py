"""
ML Training Pipeline — Logistic Regression Recovery Predictor
==============================================================
Trains a Logistic Regression model on synthetic payment failure data to
predict recovery probability.

IMPORTANT: Trained on SIMULATED data only. Metrics do NOT represent real
payment system performance. This is a student research project.

Usage:
    python train.py [--data ../data/training_data.csv] [--output ../models/]
                    [--seed 42] [--rows 10000]
"""

import argparse
import json
import logging
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s")
logger = logging.getLogger(__name__)

MODEL_NAME = "recovery_logistic_regression"
MODEL_VERSION = "1.0.0"

CATEGORICAL_FEATURES = ["payment_method", "gateway", "failure_reason"]
NUMERIC_FEATURES = [
    "amount",
    "network_latency",
    "gateway_health",
    "issuer_health",
    "customer_action_required",
    "previous_attempt_count",
    "recent_gateway_success_rate",
    "historical_recovery_rate",
    "time_since_failure",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "recovered"


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )
    model = LogisticRegression(
        max_iter=1000,
        solver="lbfgs",
        random_state=42,
        C=1.0,
        class_weight="balanced",
    )
    return Pipeline([("preprocessor", preprocessor), ("classifier", model)])


def evaluate(pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    return {
        "accuracy":  round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall":    round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score":  round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc":   round(float(roc_auc_score(y_test, y_proba)), 4),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data",   default="../data/training_data.csv")
    parser.add_argument("--output", default="../models/")
    parser.add_argument("--seed",   type=int, default=42)
    parser.add_argument("--rows",   type=int, default=10_000)
    args = parser.parse_args()

    # ── 1. Load or generate data ─────────────────────────────────────────────
    data_path = Path(args.data)
    if not data_path.exists():
        logger.info("Training data not found — generating it now...")
        from generate_data import generate_dataset
        df = generate_dataset(args.rows, args.seed)
        data_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(data_path, index=False)
    else:
        df = pd.read_csv(data_path)

    logger.info(f"Dataset: {len(df):,} rows | Recovery rate: {df[TARGET].mean():.1%}")

    # ── 2. Feature/target split ──────────────────────────────────────────────
    X = df[ALL_FEATURES]
    y = df[TARGET]

    # ── 3. Train / test split (stratified for class balance) ─────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=args.seed, stratify=y
    )
    logger.info(f"Train: {len(X_train):,} | Test: {len(X_test):,}")

    # ── 4. Build and train pipeline ──────────────────────────────────────────
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    logger.info("Training complete.")

    # ── 5. Evaluate ──────────────────────────────────────────────────────────
    metrics = evaluate(pipeline, X_test, y_test)
    logger.info("Evaluation (Synthetic Dataset — NOT real payment performance):")
    for k, v in metrics.items():
        if k != "confusion_matrix":
            logger.info(f"  {k}: {v}")
    logger.info(f"  confusion_matrix: {metrics['confusion_matrix']}")

    # ── 6. Save model ─────────────────────────────────────────────────────────
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "recovery_model.joblib"
    joblib.dump(pipeline, model_path)
    logger.info(f"Model saved → {model_path.resolve()}")

    # ── 7. Save metadata ──────────────────────────────────────────────────────
    metadata = {
        "model_name":    MODEL_NAME,
        "model_version": MODEL_VERSION,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset_size":  len(df),
        "train_size":    len(X_train),
        "test_size":     len(X_test),
        "features":      ALL_FEATURES,
        "target":        TARGET,
        "metrics":       metrics,
        "notice":        (
            "SIMULATED DATA NOTICE: Model trained on synthetic payment failure data "
            "generated for this student research project. Metrics do NOT represent "
            "real payment system performance."
        ),
    }
    meta_path = out_dir / "model_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Metadata saved → {meta_path.resolve()}")
    logger.info("Training pipeline complete ✓")


if __name__ == "__main__":
    main()
