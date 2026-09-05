import { RecoveryAction } from "@prisma/client";
import { SyntheticTransaction } from "./syntheticData.service";

export interface DecisionResult {
  recommendedAction: RecoveryAction;
  suggestedDelay: number | null;
  expectedRecoveryValue: number;
  decisionReason: string;
}

export class RecoveryDecisionService {
  /**
   * Combines ML prediction with deterministic business rules to decide the recovery action.
   * This logic is purely SIMULATED.
   */
  static evaluate(transaction: SyntheticTransaction, recoveryProbability: number): DecisionResult {
    // Basic cost assumptions (Simulated)
    const SIMULATED_RECOVERY_COST = 2.50; // $2.50 base cost for retry
    const SIMULATED_RISK_COST = 0.50; // Extra friction/risk cost

    // Calculate expected recovery value
    const expectedValue = (recoveryProbability * transaction.amount) - SIMULATED_RECOVERY_COST - SIMULATED_RISK_COST;
    const expectedRecoveryValue = parseFloat(expectedValue.toFixed(2));

    // 1. STOP - Permanent Failures or High Risk
    if (transaction.failure_reason === "card_expired" || transaction.failure_reason === "suspected_fraud") {
      return {
        recommendedAction: RecoveryAction.STOP,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: `Failure reason '${transaction.failure_reason}' is permanent or too risky.`,
      };
    }

    if (transaction.previous_attempt_count >= 3) {
      return {
        recommendedAction: RecoveryAction.STOP,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: "Previous retry attempts have reached or exceeded the maximum limit of 3.",
      };
    }

    if (expectedRecoveryValue <= 0) {
      return {
        recommendedAction: RecoveryAction.STOP,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: `Expected recovery value is non-positive (${expectedRecoveryValue.toFixed(2)}). Cost of recovery exceeds expected recovered amount.`,
      };
    }

    if (recoveryProbability < 0.1) {
      return {
        recommendedAction: RecoveryAction.STOP,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: `Recovery probability is extremely low (${recoveryProbability}). Not worth retrying.`,
      };
    }

    // 2. CUSTOMER_ACTION_REQUIRED
    if (transaction.customer_action_required) {
      return {
        recommendedAction: RecoveryAction.CUSTOMER_ACTION_REQUIRED,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: "The transaction explicitly requires customer action (e.g. authentication).",
      };
    }

    // 3. ALTERNATE_ROUTE
    if (transaction.gateway_health < 0.5 && recoveryProbability >= 0.3) {
      return {
        recommendedAction: RecoveryAction.ALTERNATE_ROUTE,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: `Gateway health is poor (${transaction.gateway_health}) but recovery probability is reasonable. Switching route.`,
      };
    }

    // 4. RETRY_NOW
    if (recoveryProbability >= 0.7 && transaction.gateway_health >= 0.7 && transaction.issuer_health >= 0.7 && expectedRecoveryValue > 0) {
      return {
        recommendedAction: RecoveryAction.RETRY_NOW,
        suggestedDelay: null,
        expectedRecoveryValue,
        decisionReason: `High recovery probability (${recoveryProbability}) and healthy network. Immediate retry is optimal and has positive expected value.`,
      };
    }

    // 5. RETRY_LATER
    // For anything moderate that doesn't fit the above
    const suggestedDelay = 15; // 15 minutes
    return {
      recommendedAction: RecoveryAction.RETRY_LATER,
      suggestedDelay,
      expectedRecoveryValue,
      decisionReason: "Recovery probability is moderate and a delayed retry is expected to provide better recovery value.",
    };
  }
}
