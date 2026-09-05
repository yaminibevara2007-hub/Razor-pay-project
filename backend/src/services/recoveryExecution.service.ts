import { RecoveryAction, RecoveryResult } from "@prisma/client";
import { DecisionResult } from "./recoveryDecision.service";
import { SyntheticTransaction } from "./syntheticData.service";
import { prisma } from "../db";

export type SimulatedOutcome = "SUCCESS" | "FAILURE" | "PENDING" | "STOPPED";

export interface ExecutionResult {
  simulated: true;
  action: RecoveryAction;
  outcome: SimulatedOutcome;
  recoveryValue: number;
  executedAt: string;
  notes: string;
}

/**
 * Deterministically decide whether a simulated retry succeeds.
 * We use a seeded approach rather than pure Math.random() so results
 * are reproducible for a given transaction + attempt combination.
 */
function deterministicSuccess(probability: number, transactionId: string, attemptNumber: number): boolean {
  // Simple deterministic hash: sum char codes + attemptNumber, scaled to [0,1]
  let hash = 0;
  for (let i = 0; i < transactionId.length; i++) {
    hash = (hash * 31 + transactionId.charCodeAt(i)) & 0x7fffffff;
  }
  hash = ((hash + attemptNumber * 9973) & 0x7fffffff);
  const normalised = hash / 0x7fffffff;
  return normalised < probability;
}

export class RecoveryExecutionService {
  /**
   * Simulates executing the recommended recovery action.
   * Every execution is explicitly marked simulated=true.
   * NO real payment request is made.
   */
  static async execute(
    transaction: SyntheticTransaction,
    decision: DecisionResult,
    recoveryProbability: number,
    attemptNumber: number
  ): Promise<ExecutionResult> {
    const executedAt = new Date().toISOString();

    // STOP — do not simulate any recovery attempt
    if (decision.recommendedAction === RecoveryAction.STOP) {
      return {
        simulated: true,
        action: RecoveryAction.STOP,
        outcome: "STOPPED",
        recoveryValue: 0,
        executedAt,
        notes: "Recovery stopped by decision engine. No attempt simulated.",
      };
    }

    // CUSTOMER_ACTION_REQUIRED — cannot proceed without customer
    if (decision.recommendedAction === RecoveryAction.CUSTOMER_ACTION_REQUIRED) {
      return {
        simulated: true,
        action: RecoveryAction.CUSTOMER_ACTION_REQUIRED,
        outcome: "PENDING",
        recoveryValue: 0,
        executedAt,
        notes: "Awaiting customer action. Recovery not executed.",
      };
    }

    // RETRY_NOW / RETRY_LATER / ALTERNATE_ROUTE — simulate outcome
    const effectiveProbability = decision.recommendedAction === RecoveryAction.ALTERNATE_ROUTE
      ? Math.min(recoveryProbability + 0.10, 0.99) // slight boost for alternate route
      : recoveryProbability;

    const success = deterministicSuccess(effectiveProbability, transaction.transactionId, attemptNumber);

    const outcome: SimulatedOutcome = success ? "SUCCESS" : "FAILURE";
    const recoveryValue = success ? transaction.amount : 0;

    const actionLabel = {
      [RecoveryAction.RETRY_NOW]:       "Immediate retry",
      [RecoveryAction.RETRY_LATER]:     `Delayed retry (${decision.suggestedDelay ?? 15} min)`,
      [RecoveryAction.ALTERNATE_ROUTE]: "Alternate gateway route",
    }[decision.recommendedAction] ?? "Retry";

    const notes = success
      ? `${actionLabel} succeeded. Simulated recovery value: ${recoveryValue.toFixed(2)}.`
      : `${actionLabel} failed. No value recovered.`;

    // Persist attempt if DB is available
    await RecoveryExecutionService.persistAttempt(
      transaction.transactionId,
      attemptNumber,
      decision.recommendedAction,
      outcome,
      recoveryValue
    ).catch((e) => {
      console.log(`[AUDIT] [RECOVERY_EXECUTED] txId=${transaction.transactionId} outcome=${outcome} value=${recoveryValue}`);
    });

    return {
      simulated: true,
      action: decision.recommendedAction,
      outcome,
      recoveryValue,
      executedAt,
      notes,
    };
  }

  private static async persistAttempt(
    transactionId: string,
    attemptNumber: number,
    action: RecoveryAction,
    outcome: SimulatedOutcome,
    recoveryValue: number
  ): Promise<void> {
    const resultMap: Record<SimulatedOutcome, RecoveryResult> = {
      SUCCESS: RecoveryResult.SUCCESS,
      FAILURE: RecoveryResult.FAILURE,
      PENDING: RecoveryResult.PENDING,
      STOPPED: RecoveryResult.PENDING,
    };

    await prisma.recoveryAttempt.create({
      data: {
        transactionId,
        attemptNumber,
        action,
        result: resultMap[outcome],
        recoveryValue: recoveryValue > 0 ? recoveryValue : undefined,
        simulated: true,
      },
    });
  }
}
