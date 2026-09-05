import { TransactionStatus } from "@prisma/client";
import { PredictionRequest } from "../ml/types";

export interface SyntheticTransaction extends PredictionRequest {
  id: string;
  transactionId: string;
  currency: string;
  timestamp: string;
  status: TransactionStatus;
}

export const PAYMENT_METHODS = [
  "card",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "net_banking",
  "wallet",
  "upi",
];

export const GATEWAYS = ["gateway_a", "gateway_b", "gateway_c"];

export const FAILURE_REASONS = [
  "insufficient_funds",
  "network_error",
  "gateway_timeout",
  "timeout",
  "issuer_declined",
  "card_expired",
  "suspected_fraud",
  "authentication_failed",
  "authentication_required",
  "temporary_gateway_error",
  "rate_limit",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class SyntheticDataService {
  /**
   * Generates a realistic SIMULATED failed payment transaction.
   * NOTE: This is entirely synthetic and does NOT represent real Razorpay/payment-provider data.
   */
  static generateFailedTransaction(overrides: Partial<SyntheticTransaction> = {}): SyntheticTransaction {
    const defaultTx: SyntheticTransaction = {
      id: `sim_uuid_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      transactionId: `tx_sim_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      amount: parseFloat(randomNumber(100, 100000).toFixed(2)),
      currency: "INR",
      payment_method: randomElement(PAYMENT_METHODS),
      gateway: randomElement(GATEWAYS),
      timestamp: new Date().toISOString(),
      failure_reason: randomElement(FAILURE_REASONS),
      network_latency: Math.floor(randomNumber(20, 500)),
      gateway_health: parseFloat(randomNumber(0.4, 1.0).toFixed(2)),
      issuer_health: parseFloat(randomNumber(0.4, 1.0).toFixed(2)),
      customer_action_required: false,
      previous_attempt_count: Math.floor(randomNumber(0, 3)),
      recent_gateway_success_rate: parseFloat(randomNumber(0.5, 0.98).toFixed(2)),
      historical_recovery_rate: parseFloat(randomNumber(0.3, 0.9).toFixed(2)),
      time_since_failure: Math.floor(randomNumber(60, 7200)), // up to 2 hours in seconds
      status: TransactionStatus.FAILED,
    };

    // Apply domain-consistent relationships
    if (
      defaultTx.failure_reason === "authentication_failed" ||
      defaultTx.failure_reason === "authentication_required" ||
      defaultTx.failure_reason === "card_expired" ||
      defaultTx.failure_reason === "suspected_fraud"
    ) {
      defaultTx.customer_action_required = true;
    }

    if (
      defaultTx.failure_reason === "gateway_timeout" ||
      defaultTx.failure_reason === "timeout"
    ) {
      defaultTx.network_latency = Math.floor(randomNumber(600, 1800));
    }

    if (
      defaultTx.failure_reason === "temporary_gateway_error" ||
      defaultTx.failure_reason === "gateway_timeout"
    ) {
      defaultTx.gateway_health = parseFloat(randomNumber(0.2, 0.55).toFixed(2));
    }

    return { ...defaultTx, ...overrides };
  }
}
