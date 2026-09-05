import { SyntheticDataService } from "./syntheticData.service";
import { RecoveryDecisionService } from "./recoveryDecision.service";
import { SafetyPolicyService } from "./safetyPolicy.service";
import { RecoveryExecutionService } from "./recoveryExecution.service";
import { mlClient } from "../ml/mlClient";
import { prisma } from "../db";

export type ExperimentStrategy = "NO_RETRY" | "FIXED_RETRY" | "RULE_BASED" | "ML_BASED" | "ADAPTIVE_RECOVERY";

export interface ExperimentMetrics {
  strategy: ExperimentStrategy;
  datasetSize: number;
  recoveryRate: number;
  recoveredValue: number;
  averageAttempts: number;
  unnecessaryAttempts: number;
  recoveryLatency: number; // simulated ms average
  recoveryCost: number;
  costPerRecovery: number;
  stopRate: number;
}

const SIMULATED_RECOVERY_COST = 2.50;

/**
 * Run a fixed-strategy that never retries.
 */
function strategyNoRetry(transactions: any[]): ExperimentMetrics {
  return {
    strategy: "NO_RETRY",
    datasetSize: transactions.length,
    recoveryRate: 0,
    recoveredValue: 0,
    averageAttempts: 0,
    unnecessaryAttempts: 0,
    recoveryLatency: 0,
    recoveryCost: 0,
    costPerRecovery: 0,
    stopRate: 1.0,
  };
}

/**
 * Always retry once after a fixed 15-minute delay. Uses deterministic outcome.
 */
function strategyFixedRetry(transactions: any[]): ExperimentMetrics {
  let recovered = 0;
  let totalValue = 0;
  let unnecessary = 0;

  for (const tx of transactions) {
    // Use historical_recovery_rate as a baseline success probability
    const prob = tx.historical_recovery_rate;
    const hash = simpleHash(tx.transactionId, 1);
    const success = hash < prob;
    if (success) {
      recovered++;
      totalValue += tx.amount;
    } else {
      unnecessary++;
    }
  }

  const n = transactions.length;
  const recoveryRate = n > 0 ? recovered / n : 0;
  const cost = n * SIMULATED_RECOVERY_COST;
  return {
    strategy: "FIXED_RETRY",
    datasetSize: n,
    recoveryRate: round(recoveryRate),
    recoveredValue: round(totalValue),
    averageAttempts: 1,
    unnecessaryAttempts: unnecessary,
    recoveryLatency: 900000, // 15 minutes fixed
    recoveryCost: round(cost),
    costPerRecovery: recovered > 0 ? round(cost / recovered) : 0,
    stopRate: 0,
  };
}

/**
 * Rule-based: retry temporary failures, stop permanent ones.
 */
function strategyRuleBased(transactions: any[]): ExperimentMetrics {
  const RETRIABLE = ["temporary_gateway_error", "network_timeout", "issuer_unavailable", "rate_limit"];
  let recovered = 0, totalValue = 0, unnecessary = 0, stopped = 0, attempts = 0;

  for (const tx of transactions) {
    if (!RETRIABLE.includes(tx.failure_reason) || tx.previous_attempt_count >= 3) {
      stopped++;
      continue;
    }
    attempts++;
    const prob = tx.historical_recovery_rate * (tx.gateway_health > 0.7 ? 1.1 : 0.8);
    const success = simpleHash(tx.transactionId, 1) < Math.min(prob, 0.99);
    if (success) { recovered++; totalValue += tx.amount; }
    else { unnecessary++; }
  }

  const n = transactions.length;
  const cost = attempts * SIMULATED_RECOVERY_COST;
  return {
    strategy: "RULE_BASED",
    datasetSize: n,
    recoveryRate: round(recovered / n),
    recoveredValue: round(totalValue),
    averageAttempts: round(attempts / Math.max(n - stopped, 1)),
    unnecessaryAttempts: unnecessary,
    recoveryLatency: 300000, // 5 min average
    recoveryCost: round(cost),
    costPerRecovery: recovered > 0 ? round(cost / recovered) : 0,
    stopRate: round(stopped / n),
  };
}

/**
 * ML-based: only retry if simulated probability ≥ 0.5.
 */
function strategyMLBased(transactions: any[]): ExperimentMetrics {
  const THRESHOLD = 0.5;
  let recovered = 0, totalValue = 0, unnecessary = 0, stopped = 0, attempts = 0;

  for (const tx of transactions) {
    const prob = simulatedMLProb(tx);
    if (prob < THRESHOLD) { stopped++; continue; }
    attempts++;
    const success = simpleHash(tx.transactionId, 1) < prob;
    if (success) { recovered++; totalValue += tx.amount; }
    else { unnecessary++; }
  }

  const n = transactions.length;
  const cost = attempts * SIMULATED_RECOVERY_COST;
  return {
    strategy: "ML_BASED",
    datasetSize: n,
    recoveryRate: round(recovered / n),
    recoveredValue: round(totalValue),
    averageAttempts: round(attempts / Math.max(n - stopped, 1)),
    unnecessaryAttempts: unnecessary,
    recoveryLatency: 180000, // 3 min average
    recoveryCost: round(cost),
    costPerRecovery: recovered > 0 ? round(cost / recovered) : 0,
    stopRate: round(stopped / n),
  };
}

/**
 * Adaptive Recovery: ML + gateway health + issuer health + cost awareness + safety.
 */
function strategyAdaptive(transactions: any[]): ExperimentMetrics {
  let recovered = 0, totalValue = 0, unnecessary = 0, stopped = 0, attempts = 0;

  for (const tx of transactions) {
    const prob = simulatedMLProb(tx);
    const erv = prob * tx.amount - SIMULATED_RECOVERY_COST - 0.5;

    // Stop conditions
    if (
      erv < 0 ||
      prob < 0.15 ||
      tx.previous_attempt_count >= 3 ||
      tx.failure_reason === "card_expired" ||
      tx.failure_reason === "suspected_fraud"
    ) {
      stopped++;
      continue;
    }

    attempts++;
    // Alternate route boost
    const effectiveProb = tx.gateway_health < 0.5
      ? Math.min(prob + 0.1, 0.99)
      : prob;

    const success = simpleHash(tx.transactionId, 1) < effectiveProb;
    if (success) { recovered++; totalValue += tx.amount; }
    else { unnecessary++; }
  }

  const n = transactions.length;
  const cost = attempts * SIMULATED_RECOVERY_COST;
  return {
    strategy: "ADAPTIVE_RECOVERY",
    datasetSize: n,
    recoveryRate: round(recovered / n),
    recoveredValue: round(totalValue),
    averageAttempts: round(attempts / Math.max(n - stopped, 1)),
    unnecessaryAttempts: unnecessary,
    recoveryLatency: 120000, // 2 min average
    recoveryCost: round(cost),
    costPerRecovery: recovered > 0 ? round(cost / recovered) : 0,
    stopRate: round(stopped / n),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function simpleHash(id: string, attempt: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7fffffff;
  return ((h + attempt * 9973) & 0x7fffffff) / 0x7fffffff;
}

function simulatedMLProb(tx: any): number {
  let prob = tx.historical_recovery_rate;
  prob += (tx.gateway_health - 0.5) * 0.15;
  prob += (tx.issuer_health - 0.5) * 0.10;
  prob -= tx.previous_attempt_count * 0.06;
  prob += (tx.recent_gateway_success_rate - 0.5) * 0.08;
  return Math.max(0.01, Math.min(0.99, prob));
}

function round(n: number, decimals = 4): number {
  return parseFloat(n.toFixed(decimals));
}

export class ExperimentService {
  /**
   * Run all 5 strategies on the SAME dataset and return comparative results.
   * NOTE: All data is SIMULATED. Results do not represent production performance.
   */
  static async runExperiment(datasetSize: number, experimentName: string): Promise<ExperimentMetrics[]> {
    // Generate deterministic dataset (same seed = same transactions = fair comparison)
    const transactions = Array.from({ length: datasetSize }, (_, i) =>
      SyntheticDataService.generateFailedTransaction({
        transactionId: `exp_${experimentName}_${i}`,
      })
    );

    const results: ExperimentMetrics[] = [
      strategyNoRetry(transactions),
      strategyFixedRetry(transactions),
      strategyRuleBased(transactions),
      strategyMLBased(transactions),
      strategyAdaptive(transactions),
    ];

    // Persist to DB if available
    for (const r of results) {
      await prisma.experimentResult.create({
        data: {
          experimentName,
          strategy: r.strategy,
          datasetSize: r.datasetSize,
          recoveryRate: r.recoveryRate,
          recoveredValue: r.recoveredValue,
          averageAttempts: r.averageAttempts,
          unnecessaryAttempts: r.unnecessaryAttempts,
          recoveryLatency: r.recoveryLatency,
          recoveryCost: r.recoveryCost,
        },
      }).catch(() => {
        /* DB not available — silently continue */
      });
    }

    return results;
  }

  static async getExperiments(): Promise<any[]> {
    return prisma.experimentResult.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
