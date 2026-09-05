"""
Synthetic Payment Failure Dataset Generator
============================================
Generates a simulated dataset of historical payment failures for ML training.

IMPORTANT: This is entirely SIMULATED data and does NOT represent real payment
transactions, real merchant data, or real recovery outcomes. It is generated
for this student research project only.

Usage:
    python generate_data.py [--rows 10000] [--seed 42] [--output ../data/training_data.csv]
"""

import argparse
import random
import numpy as np
import pandas as pd
from pathlib import Path

# Failure reasons and their properties
# (base_recovery_rate, customer_action_required, is_permanent)
FAILURE_REASON_PROPS = {
    "temporary_gateway_error": (0.72, False, False),
    "network_timeout":         (0.68, False, False),
    "issuer_unavailable":      (0.55, False, False),
    "insufficient_funds":      (0.40, False, False),
    "authentication_required": (0.60, True,  False),
    "rate_limit":              (0.65, False, False),
    "card_expired":            (0.05, False, True),
    "suspected_fraud":         (0.03, False, True),
}

PAYMENT_METHODS = ["credit_card", "debit_card", "upi", "net_banking", "wallet"]
GATEWAYS       = ["gateway_a", "gateway_b", "gateway_c"]


def generate_dataset(n_rows: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    records = []

    failure_reasons = list(FAILURE_REASON_PROPS.keys())

    for i in range(n_rows):
        failure_reason = rng.choice(failure_reasons)
        base_rate, must_action, is_permanent = FAILURE_REASON_PROPS[failure_reason]

        amount = float(rng.uniform(100, 100_000))
        payment_method = rng.choice(PAYMENT_METHODS)
        gateway = rng.choice(GATEWAYS)
        network_latency = int(rng.integers(20, 1001))
        gateway_health = float(rng.uniform(0.0, 1.0))
        issuer_health = float(rng.uniform(0.0, 1.0))
        customer_action_required = bool(must_action or (rng.random() < 0.05))
        previous_attempt_count = int(rng.integers(0, 5))
        recent_gateway_success_rate = float(rng.uniform(0.3, 1.0))
        historical_recovery_rate = float(rng.uniform(0.2, 0.9))
        time_since_failure = int(rng.integers(0, 7201))  # 0–2 hours in seconds

        # ----- Simulate realistic recovery probability -----
        # Start from the failure-reason base rate
        prob = base_rate

        # Boost for healthy infrastructure
        prob += (gateway_health - 0.5) * 0.15
        prob += (issuer_health - 0.5) * 0.10

        # Penalise for repeated attempts
        prob -= previous_attempt_count * 0.06

        # Boost for historically successful gateways
        prob += (recent_gateway_success_rate - 0.5) * 0.08
        prob += (historical_recovery_rate - 0.5) * 0.05

        # Penalty for high network latency
        prob -= (network_latency / 1000.0) * 0.05

        # Permanent failures have near-zero probability
        if is_permanent:
            prob = min(prob, 0.08)

        # Clip
        prob = float(np.clip(prob, 0.01, 0.99))

        # ----- Label: was the transaction successfully recovered? -----
        # We use a seeded draw so the dataset is deterministic and reproducible.
        # The draw is based on simulated probability — this is NOT derived from
        # any real payment system outcome.
        recovered = int(rng.random() < prob)

        records.append({
            "amount": round(amount, 2),
            "payment_method": payment_method,
            "gateway": gateway,
            "failure_reason": failure_reason,
            "network_latency": network_latency,
            "gateway_health": round(gateway_health, 4),
            "issuer_health": round(issuer_health, 4),
            "customer_action_required": int(customer_action_required),
            "previous_attempt_count": previous_attempt_count,
            "recent_gateway_success_rate": round(recent_gateway_success_rate, 4),
            "historical_recovery_rate": round(historical_recovery_rate, 4),
            "time_since_failure": time_since_failure,
            "recovered": recovered,
        })

    df = pd.DataFrame(records)
    recovery_rate = df["recovered"].mean()
    print(f"Generated {len(df):,} simulated transactions")
    print(f"Simulated recovery rate: {recovery_rate:.1%}")
    print("NOTE: This is synthetic data for student research only.")
    return df


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic payment failure dataset")
    parser.add_argument("--rows",   type=int, default=10_000,                   help="Number of rows")
    parser.add_argument("--seed",   type=int, default=42,                        help="Random seed")
    parser.add_argument("--output", type=str, default="../data/training_data.csv", help="Output CSV path")
    args = parser.parse_args()

    df = generate_dataset(args.rows, args.seed)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"Saved to {out_path.resolve()}")


if __name__ == "__main__":
    main()
