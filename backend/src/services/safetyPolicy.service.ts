import { SafetyResult, TransactionStatus } from "@prisma/client";
import { SyntheticTransaction } from "./syntheticData.service";

// Safety configuration — easy to adjust
const MAX_RETRY_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 5;
const HIGH_RISK_ISSUER_HEALTH_THRESHOLD = 0.1;
const HIGH_RISK_GATEWAY_HEALTH_THRESHOLD = 0.1;

export interface SafetyCheckResult {
  transactionStatusCheck: boolean;
  duplicateCheck: boolean;
  idempotencyCheck: boolean;
  retryLimitCheck: boolean;
  cooldownCheck: boolean;
  riskThresholdCheck: boolean;
  finalSafetyResult: SafetyResult;
  failureReason: string | null;
}

/**
 * A simulated record of previously recovered transactions.
 * In production this would be a database query.
 */
const simulatedRecoveredTransactionIds = new Set<string>();

/**
 * Simulated idempotency store — tracks attempt IDs to avoid duplicate execution.
 */
const simulatedIdempotencyKeys = new Map<string, number>(); // transactionId → last attempt epoch ms

export class SafetyPolicyService {
  /**
   * Evaluates all safety rules before a recovery action is permitted.
   * This logic is purely SIMULATED and is NOT connected to real payment systems.
   */
  static evaluate(
    transaction: SyntheticTransaction,
    transactionStatus: TransactionStatus = TransactionStatus.FAILED
  ): SafetyCheckResult {
    // --- 1. Transaction Status Check ---
    const transactionStatusCheck =
      transactionStatus !== TransactionStatus.RECOVERED &&
      transactionStatus !== TransactionStatus.FAILED_PERMANENTLY;

    if (!transactionStatusCheck) {
      return this.blocked(
        {
          transactionStatusCheck,
          duplicateCheck: false,
          idempotencyCheck: false,
          retryLimitCheck: false,
          cooldownCheck: false,
          riskThresholdCheck: false,
        },
        `Transaction is already in a terminal state: ${transactionStatus}. Recovery blocked.`
      );
    }

    // --- 2. Duplicate Check ---
    // Block if this transaction has already been successfully recovered (simulated).
    const duplicateCheck = !simulatedRecoveredTransactionIds.has(transaction.transactionId);

    if (!duplicateCheck) {
      return this.blocked(
        { transactionStatusCheck, duplicateCheck, idempotencyCheck: false, retryLimitCheck: false, cooldownCheck: false, riskThresholdCheck: false },
        `Duplicate recovery attempt blocked: transaction ${transaction.transactionId} has already been recovered.`
      );
    }

    // --- 3. Idempotency Check ---
    // Block if there was an attempt too recently (within cooldown window).
    const lastAttemptMs = simulatedIdempotencyKeys.get(transaction.transactionId);
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    const now = Date.now();
    const idempotencyCheck = lastAttemptMs === undefined || (now - lastAttemptMs) > cooldownMs;

    if (!idempotencyCheck) {
      const waitSec = Math.ceil((cooldownMs - (now - lastAttemptMs!)) / 1000);
      return this.blocked(
        { transactionStatusCheck, duplicateCheck, idempotencyCheck, retryLimitCheck: false, cooldownCheck: false, riskThresholdCheck: false },
        `Idempotency guard: a recovery attempt was made recently. Wait ${waitSec}s before retrying.`
      );
    }

    // --- 4. Retry Limit Check ---
    const retryLimitCheck = transaction.previous_attempt_count < MAX_RETRY_ATTEMPTS;

    if (!retryLimitCheck) {
      return this.blocked(
        { transactionStatusCheck, duplicateCheck, idempotencyCheck, retryLimitCheck, cooldownCheck: false, riskThresholdCheck: false },
        `Retry limit exceeded: ${transaction.previous_attempt_count} attempts already made (max: ${MAX_RETRY_ATTEMPTS}).`
      );
    }

    // --- 5. Cooldown Check ---
    // Uses timeSinceFailure to approximate whether enough time has passed.
    // In production this would track actual retry timestamps.
    const cooldownSeconds = COOLDOWN_MINUTES * 60;
    const cooldownCheck = transaction.time_since_failure >= cooldownSeconds || transaction.previous_attempt_count === 0;

    if (!cooldownCheck) {
      return this.blocked(
        { transactionStatusCheck, duplicateCheck, idempotencyCheck, retryLimitCheck, cooldownCheck, riskThresholdCheck: false },
        `Cooldown active: only ${transaction.time_since_failure}s have passed since the last failure (minimum: ${cooldownSeconds}s).`
      );
    }

    // --- 6. Risk Threshold Check ---
    const isSuspectedFraud = transaction.failure_reason === "suspected_fraud";
    const isExtremelyHighAttempts = transaction.previous_attempt_count >= MAX_RETRY_ATTEMPTS - 1 &&
      transaction.gateway_health < HIGH_RISK_GATEWAY_HEALTH_THRESHOLD;
    const isExtremelyPoorHealth =
      transaction.issuer_health < HIGH_RISK_ISSUER_HEALTH_THRESHOLD &&
      transaction.gateway_health < HIGH_RISK_GATEWAY_HEALTH_THRESHOLD;

    const riskThresholdCheck = !isSuspectedFraud && !isExtremelyHighAttempts && !isExtremelyPoorHealth;

    if (!riskThresholdCheck) {
      const reasons: string[] = [];
      if (isSuspectedFraud) reasons.push("suspected fraud");
      if (isExtremelyHighAttempts) reasons.push("high attempt count combined with very poor gateway health");
      if (isExtremelyPoorHealth) reasons.push("critically poor issuer and gateway health");
      return this.blocked(
        { transactionStatusCheck, duplicateCheck, idempotencyCheck, retryLimitCheck, cooldownCheck, riskThresholdCheck },
        `Risk threshold exceeded: ${reasons.join(", ")}.`
      );
    }

    // --- All checks PASSED —
    // Register idempotency key for this attempt
    simulatedIdempotencyKeys.set(transaction.transactionId, now);

    return {
      transactionStatusCheck,
      duplicateCheck,
      idempotencyCheck,
      retryLimitCheck,
      cooldownCheck,
      riskThresholdCheck,
      finalSafetyResult: SafetyResult.PASSED,
      failureReason: null,
    };
  }

  /**
   * Mark a transaction as already recovered (to simulate the duplicate check).
   */
  static markAsRecovered(transactionId: string): void {
    simulatedRecoveredTransactionIds.add(transactionId);
  }

  private static blocked(
    checks: Omit<SafetyCheckResult, "finalSafetyResult" | "failureReason">,
    reason: string
  ): SafetyCheckResult {
    return {
      ...checks,
      finalSafetyResult: SafetyResult.BLOCKED,
      failureReason: reason,
    };
  }
}
