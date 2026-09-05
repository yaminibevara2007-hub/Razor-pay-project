import { Request, Response } from "express";
import { TransactionDbService } from "../services/transactionDb.service";

export class TransactionController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(String(req.query.limit ?? "50"));
      const offset = parseInt(String(req.query.offset ?? "0"));
      const filters: Record<string, string> = {};
      if (req.query.status) filters.status = String(req.query.status);
      if (req.query.gateway) filters.gateway = String(req.query.gateway);
      if (req.query.paymentMethod) filters.paymentMethod = String(req.query.paymentMethod);
      if (req.query.failureReason) filters.failureReason = String(req.query.failureReason);

      const { items, total } = await TransactionDbService.getAll(limit, offset, filters);
      res.json({ success: true, data: items, total, limit, offset });
    } catch (e) {
      res.status(503).json({ success: false, message: "Transactions unavailable (DB may be offline)" });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const tx = await TransactionDbService.getById(id);
      if (!tx) {
        res.status(404).json({ success: false, message: `Transaction ${id} not found` });
        return;
      }
      res.json({ success: true, data: tx });
    } catch (e) {
      res.status(503).json({ success: false, message: "Transaction lookup unavailable" });
    }
  }

  async getDecisions(req: Request, res: Response): Promise<void> {
    try {
      const data = await TransactionDbService.getRecoveryDecisions();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Recovery decisions unavailable" });
    }
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = req.query.transactionId ? String(req.query.transactionId) : undefined;
      const eventType = req.query.eventType ? String(req.query.eventType) : undefined;
      const data = await TransactionDbService.getAuditLogs(transactionId, eventType);
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Audit logs unavailable" });
    }
  }
}

export const transactionController = new TransactionController();
