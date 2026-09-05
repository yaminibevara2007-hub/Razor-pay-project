import { prisma } from "../db";

export class TransactionDbService {
  static async getAll(limit = 50, offset = 0, filters: Record<string, string> = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.gateway) where.gateway = filters.gateway;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.failureReason) where.failureReason = filters.failureReason;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          modelPredictions: { orderBy: { createdAt: "desc" }, take: 1 },
          recoveryDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
          safetyChecks: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }).catch(() => []),
      prisma.transaction.count({ where }).catch(() => 0),
    ]);

    return { items, total };
  }

  static async getById(transactionId: string) {
    return prisma.transaction.findUnique({
      where: { transactionId },
      include: {
        modelPredictions: { orderBy: { createdAt: "asc" } },
        recoveryDecisions: { orderBy: { createdAt: "asc" } },
        safetyChecks: { orderBy: { createdAt: "asc" } },
        recoveryAttempts: { orderBy: { attemptedAt: "asc" } },
        auditLogs: { orderBy: { timestamp: "asc" } },
      },
    }).catch(() => null);
  }

  static async getAuditLogs(transactionId?: string, eventType?: string) {
    const where: any = {};
    if (transactionId) where.transactionId = transactionId;
    if (eventType) where.eventType = eventType;
    return prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 200,
    }).catch(() => []);
  }

  static async getRecoveryDecisions() {
    return prisma.recoveryDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        transaction: { select: { transactionId: true, amount: true, currency: true, gateway: true } },
      },
    }).catch(() => []);
  }
}
