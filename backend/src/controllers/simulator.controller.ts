import { Request, Response } from "express";
import { z } from "zod";
import { SyntheticDataService } from "../services/syntheticData.service";
import { recoveryService } from "../services/recovery.service";
import { RecoveryDecisionService } from "../services/recoveryDecision.service";
import { SafetyPolicyService } from "../services/safetyPolicy.service";
import { RecoveryExecutionService } from "../services/recoveryExecution.service";
import { MLServiceError } from "../ml/mlClient";

const TransactionInputSchema = z.object({
  amount: z.number().positive().optional(),
  payment_method: z.string().optional(),
  gateway: z.string().optional(),
  failure_reason: z.string().optional(),
  network_latency: z.number().int().nonnegative().optional(),
  gateway_health: z.number().min(0).max(1).optional(),
  issuer_health: z.number().min(0).max(1).optional(),
  customer_action_required: z.boolean().optional(),
  previous_attempt_count: z.number().int().nonnegative().optional(),
  recent_gateway_success_rate: z.number().min(0).max(1).optional(),
  historical_recovery_rate: z.number().min(0).max(1).optional(),
  time_since_failure: z.number().int().nonnegative().optional(),
});

export class SimulatorController {
  /** POST /api/simulator/transaction — generate a new simulated failed transaction */
  generateTransaction(req: Request, res: Response): void {
    const parsed = TransactionInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.issues });
      return;
    }
    const tx = SyntheticDataService.generateFailedTransaction(parsed.data as any);
    res.json({ success: true, transaction: tx });
  }

  /** POST /api/simulator/evaluate — run full ML+Decision+Safety pipeline */
  async evaluate(req: Request, res: Response): Promise<void> {
    const body = req.body;
    if (!body?.transactionId) {
      res.status(400).json({ success: false, message: "transactionId is required" });
      return;
    }
    try {
      const result = await recoveryService.evaluate({
        transactionId: body.transactionId,
        amount: body.amount,
        currency: body.currency ?? "INR",
        payment_method: body.payment_method,
        gateway: body.gateway,
        failure_reason: body.failure_reason,
        network_latency: body.network_latency,
        gateway_health: body.gateway_health,
        issuer_health: body.issuer_health,
        customer_action_required: body.customer_action_required,
        previous_attempt_count: body.previous_attempt_count,
        recent_gateway_success_rate: body.recent_gateway_success_rate,
        historical_recovery_rate: body.historical_recovery_rate,
        time_since_failure: body.time_since_failure,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      if (err instanceof MLServiceError) {
        res.status(503).json({ success: false, error: "ML_SERVICE_UNAVAILABLE", message: err.message });
        return;
      }
      console.error("[SimulatorController.evaluate]", err);
      res.status(500).json({ success: false, message: "Internal error during evaluation" });
    }
  }

  /** POST /api/simulator/execute — execute the simulated recovery */
  async execute(req: Request, res: Response): Promise<void> {
    const { transaction, decision, prediction } = req.body;
    if (!transaction || !decision || !prediction) {
      res.status(400).json({ success: false, message: "transaction, decision, and prediction are required" });
      return;
    }
    try {
      const result = await RecoveryExecutionService.execute(
        transaction,
        decision,
        prediction.recovery_probability,
        (transaction.previous_attempt_count ?? 0) + 1
      );
      res.json({ success: true, execution: result });
    } catch (err) {
      console.error("[SimulatorController.execute]", err);
      res.status(500).json({ success: false, message: "Internal error during execution" });
    }
  }
}

export const simulatorController = new SimulatorController();
