import { prisma } from "../db";

export class AnalyticsService {
  static async getOverview() {
    // These all gracefully fail if DB is unavailable
    const [transactions, attempts, predictions] = await Promise.all([
      prisma.transaction.findMany({ select: { status: true } }).catch(() => []),
      prisma.recoveryAttempt.findMany({ select: { result: true, recoveryValue: true, action: true } }).catch(() => []),
      prisma.modelPrediction.findMany({ select: { recoveryProbability: true } }).catch(() => []),
    ]);

    const total = transactions.length;
    const recovered = transactions.filter((t) => t.status === "RECOVERED").length;
    const failed = transactions.filter((t) => t.status !== "RECOVERED").length;
    const recoveryRate = total > 0 ? recovered / total : 0;

    const recoveredValue = attempts
      .filter((a) => a.result === "SUCCESS")
      .reduce((sum, a) => sum + (a.recoveryValue ?? 0), 0);

    const avgProbability =
      predictions.length > 0
        ? predictions.reduce((s, p) => s + p.recoveryProbability, 0) / predictions.length
        : 0;

    const avgAttempts =
      total > 0
        ? attempts.length / total
        : 0;

    return {
      totalTransactions: total,
      failedTransactions: failed,
      recoveredTransactions: recovered,
      recoveryRate: parseFloat(recoveryRate.toFixed(4)),
      recoveredValue: parseFloat(recoveredValue.toFixed(2)),
      averageRecoveryProbability: parseFloat(avgProbability.toFixed(4)),
      averageAttempts: parseFloat(avgAttempts.toFixed(2)),
    };
  }

  static async getOutcomes() {
    const attempts = await prisma.recoveryAttempt.findMany({ select: { result: true } }).catch(() => []);
    const counts: Record<string, number> = { SUCCESS: 0, FAILURE: 0, PENDING: 0 };
    for (const a of attempts) counts[a.result] = (counts[a.result] ?? 0) + 1;
    return Object.entries(counts).map(([result, count]) => ({ result, count }));
  }

  static async getActions() {
    const decisions = await prisma.recoveryDecision.findMany({ select: { recommendedAction: true } }).catch(() => []);
    const counts: Record<string, number> = {};
    for (const d of decisions) counts[d.recommendedAction] = (counts[d.recommendedAction] ?? 0) + 1;
    return Object.entries(counts).map(([action, count]) => ({ action, count }));
  }

  static async getGateways() {
    const health = await prisma.gatewayHealth.findMany().catch(() => []);
    return health;
  }

  static async getFailures() {
    const txs = await prisma.transaction.findMany({ select: { failureReason: true } }).catch(() => []);
    const counts: Record<string, number> = {};
    for (const t of txs) counts[t.failureReason] = (counts[t.failureReason] ?? 0) + 1;
    return Object.entries(counts).map(([reason, count]) => ({ reason, count }));
  }

  static async getRecoveryValueOverTime() {
    const attempts = await prisma.recoveryAttempt.findMany({
      where: { result: "SUCCESS" },
      select: { attemptedAt: true, recoveryValue: true },
      orderBy: { attemptedAt: "asc" },
    }).catch(() => []);

    return attempts.map((a) => ({
      date: a.attemptedAt.toISOString().slice(0, 10),
      value: a.recoveryValue ?? 0,
    }));
  }
}
