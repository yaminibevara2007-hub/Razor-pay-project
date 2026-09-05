import { Prisma, RecoveryAction, SafetyResult } from "@prisma/client";
import { prisma } from "../db";
import { mlClient, MLServiceError } from "../ml/mlClient";
import { PredictionRequest, PredictionResponse } from "../ml/types";
import { RecoveryDecisionService, DecisionResult } from "./recoveryDecision.service";
import { SafetyPolicyService, SafetyCheckResult } from "./safetyPolicy.service";
import { SyntheticTransaction } from "./syntheticData.service";

export interface RecoveryEvaluationInput {
  transactionId: string;
  amount: number;
  currency: string;
  payment_method: string;
  gateway: string;
  failure_reason: string;
  network_latency: number;
  gateway_health: number;
  issuer_health: number;
  customer_action_required: boolean;
  previous_attempt_count: number;
  recent_gateway_success_rate: number;
  historical_recovery_rate: number;
  time_since_failure: number;
}

export interface RecoveryEvaluationResult {
  transaction: {
    transactionId: string;
    amount: number;
    currency: string;
    gateway: string;
    failureReason: string;
  };
  prediction: PredictionResponse;
  decision: {
    recommendedAction: RecoveryAction;
    suggestedDelay: number | null;
    expectedRecoveryValue: number;
    decisionReason: string;
  };
  safety: {
    finalSafetyResult: SafetyResult;
    checks: {
      transactionStatusCheck: boolean;
      duplicateCheck: boolean;
      idempotencyCheck: boolean;
      retryLimitCheck: boolean;
      cooldownCheck: boolean;
      riskThresholdCheck: boolean;
    };
    failureReason: string | null;
  };
}

export class RecoveryService {
  /**
   * Orchestrates the full recovery evaluation pipeline:
   * ML Prediction → Recovery Decision Engine → Safety Policy → Response + Audit Log
   */
  async evaluate(input: RecoveryEvaluationInput): Promise<RecoveryEvaluationResult> {
    const mlRequest: PredictionRequest = {
      amount: input.amount,
      payment_method: input.payment_method,
      gateway: input.gateway,
      failure_reason: input.failure_reason,
      network_latency: input.network_latency,
      gateway_health: input.gateway_health,
      issuer_health: input.issuer_health,
      previous_attempt_count: input.previous_attempt_count,
      recent_gateway_success_rate: input.recent_gateway_success_rate,
      historical_recovery_rate: input.historical_recovery_rate,
      time_since_failure: input.time_since_failure,
      customer_action_required: input.customer_action_required,
    };

    // Step 1: ML Prediction — throws if ML service is unavailable (no silent fallback)
    const prediction = await mlClient.predict(mlRequest);

    await this.auditLog(input.transactionId, "PREDICTION_GENERATED", {
      model_name: prediction.model_name,
      model_version: prediction.model_version,
      recovery_probability: prediction.recovery_probability,
    });

    // Step 2: Build a SyntheticTransaction-compatible object for the engines
    const tx: SyntheticTransaction = {
      id: input.transactionId,
      transactionId: input.transactionId,
      currency: input.currency,
      timestamp: new Date().toISOString(),
      status: "FAILED" as any,
      amount: input.amount,
      payment_method: input.payment_method,
      gateway: input.gateway,
      failure_reason: input.failure_reason,
      network_latency: input.network_latency,
      gateway_health: input.gateway_health,
      issuer_health: input.issuer_health,
      customer_action_required: input.customer_action_required,
      previous_attempt_count: input.previous_attempt_count,
      recent_gateway_success_rate: input.recent_gateway_success_rate,
      historical_recovery_rate: input.historical_recovery_rate,
      time_since_failure: input.time_since_failure,
    };

    // Step 3: Recovery Decision Engine
    const decision: DecisionResult = RecoveryDecisionService.evaluate(tx, prediction.recovery_probability);

    await this.auditLog(input.transactionId, "RECOVERY_DECISION_CREATED", {
      recommendedAction: decision.recommendedAction,
      expectedRecoveryValue: decision.expectedRecoveryValue,
      suggestedDelay: decision.suggestedDelay,
    });

    // Step 4: Safety Policy
    const safety: SafetyCheckResult = SafetyPolicyService.evaluate(tx);

    await this.auditLog(input.transactionId, "SAFETY_CHECK_COMPLETED", {
      finalSafetyResult: safety.finalSafetyResult,
      failureReason: safety.failureReason,
    });

    // Step 5: If safety blocks → final action must be STOP
    const finalAction = safety.finalSafetyResult !== SafetyResult.PASSED
      ? RecoveryAction.STOP
      : decision.recommendedAction;

    const finalDecision: DecisionResult = safety.finalSafetyResult !== SafetyResult.PASSED
      ? {
        ...decision,
        recommendedAction: RecoveryAction.STOP,
        decisionReason: `Safety policy blocked recovery: ${safety.failureReason}`,
      }
      : decision;

    // Step 6: Persist to database if available (non-blocking — DB errors are logged not thrown)
    await this.persistToDB(input, prediction, finalDecision, safety).catch((err) => {
      console.warn("[RecoveryService] DB persistence skipped (PostgreSQL unavailable):", err.message);
    });

    return {
      transaction: {
        transactionId: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        gateway: input.gateway,
        failureReason: input.failure_reason,
      },
      prediction,
      decision: {
        recommendedAction: finalAction,
        suggestedDelay: finalDecision.suggestedDelay,
        expectedRecoveryValue: finalDecision.expectedRecoveryValue,
        decisionReason: finalDecision.decisionReason,
      },
      safety: {
        finalSafetyResult: safety.finalSafetyResult,
        checks: {
          transactionStatusCheck: safety.transactionStatusCheck,
          duplicateCheck: safety.duplicateCheck,
          idempotencyCheck: safety.idempotencyCheck,
          retryLimitCheck: safety.retryLimitCheck,
          cooldownCheck: safety.cooldownCheck,
          riskThresholdCheck: safety.riskThresholdCheck,
        },
        failureReason: safety.failureReason,
      },
    };
  }

  private async persistToDB(
    input: RecoveryEvaluationInput,
    prediction: PredictionResponse,
    decision: DecisionResult,
    safety: SafetyCheckResult
  ): Promise<void> {
    // Upsert the transaction record
    await prisma.transaction.upsert({
      where: { transactionId: input.transactionId },
      update: { updatedAt: new Date() },
      create: {
        transactionId: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        paymentMethod: input.payment_method,
        gateway: input.gateway,
        failureReason: input.failure_reason,
        networkLatency: input.network_latency,
        gatewayHealth: input.gateway_health,
        issuerHealth: input.issuer_health,
        customerActionRequired: input.customer_action_required,
        previousAttemptCount: input.previous_attempt_count,
        recentGatewaySuccessRate: input.recent_gateway_success_rate,
        historicalRecoveryRate: input.historical_recovery_rate,
        timeSinceFailure: input.time_since_failure,
        status: "FAILED",
      },
    });

    // Persist ML Prediction
    await prisma.modelPrediction.create({
      data: {
        transactionId: input.transactionId,
        modelName: prediction.model_name,
        modelVersion: prediction.model_version,
        recoveryProbability: prediction.recovery_probability,
        features: mlRequest(input) as Prisma.InputJsonValue,
      },
    });

    // Persist Recovery Decision
    await prisma.recoveryDecision.create({
      data: {
        transactionId: input.transactionId,
        recoveryProbability: prediction.recovery_probability,
        recommendedAction: decision.recommendedAction,
        suggestedDelay: decision.suggestedDelay ?? undefined,
        expectedRecoveryValue: decision.expectedRecoveryValue,
        decisionReason: decision.decisionReason,
      },
    });

    // Persist Safety Check
    await prisma.safetyCheck.create({
      data: {
        transactionId: input.transactionId,
        transactionStatusCheck: safety.transactionStatusCheck,
        duplicateCheck: safety.duplicateCheck,
        idempotencyCheck: safety.idempotencyCheck,
        retryLimitCheck: safety.retryLimitCheck,
        cooldownCheck: safety.cooldownCheck,
        riskThresholdCheck: safety.riskThresholdCheck,
        finalSafetyResult: safety.finalSafetyResult,
        failureReason: safety.failureReason ?? undefined,
      },
    });
  }

  /**
   * Logs an audit event. If DB is unavailable, falls back to console log (non-blocking).
   */
  private async auditLog(
    transactionId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          transactionId,
          eventType,
          eventData: eventData as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Database unavailable — log to console as fallback
      console.log(`[AUDIT] [${eventType}] txId=${transactionId}`, JSON.stringify(eventData));
    }
  }
}

/** Helper to produce ML feature snapshot for storage */
function mlRequest(input: RecoveryEvaluationInput): Record<string, unknown> {
  return {
    amount: input.amount,
    payment_method: input.payment_method,
    gateway: input.gateway,
    failure_reason: input.failure_reason,
    network_latency: input.network_latency,
    gateway_health: input.gateway_health,
    issuer_health: input.issuer_health,
    previous_attempt_count: input.previous_attempt_count,
    recent_gateway_success_rate: input.recent_gateway_success_rate,
    historical_recovery_rate: input.historical_recovery_rate,
    time_since_failure: input.time_since_failure,
    customer_action_required: input.customer_action_required,
  };
}

export const recoveryService = new RecoveryService();
