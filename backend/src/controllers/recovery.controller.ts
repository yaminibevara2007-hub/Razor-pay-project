import { z } from "zod";
import { Request, Response } from "express";
import { recoveryService } from "../services/recovery.service";
import { MLServiceError } from "../ml/mlClient";

const RecoveryEvaluateSchema = z.object({
  transactionId: z.string().min(1, "transactionId is required"),
  amount: z.number().positive("amount must be a positive number"),
  currency: z.string().default("INR"),
  payment_method: z.string().min(1, "payment_method is required"),
  gateway: z.string().min(1, "gateway is required"),
  failure_reason: z.string().min(1, "failure_reason is required"),
  network_latency: z.number().int().nonnegative("network_latency must be >= 0"),
  gateway_health: z.number().min(0).max(1, "gateway_health must be between 0 and 1"),
  issuer_health: z.number().min(0).max(1, "issuer_health must be between 0 and 1"),
  customer_action_required: z.boolean(),
  previous_attempt_count: z.number().int().nonnegative("previous_attempt_count must be >= 0"),
  recent_gateway_success_rate: z.number().min(0).max(1),
  historical_recovery_rate: z.number().min(0).max(1),
  time_since_failure: z.number().int().nonnegative("time_since_failure must be >= 0"),
});

export class RecoveryController {
  async evaluate(req: Request, res: Response): Promise<void> {
    // Validate request body
    const validationResult = RecoveryEvaluateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.issues,
      });
      return;
    }

    try {
      const result = await recoveryService.evaluate(validationResult.data);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof MLServiceError) {
        // Pass ML service failures back as 503 — never fake a prediction
        res.status(503).json({
          success: false,
          message: `ML service error: ${error.message}`,
          error: "ML_SERVICE_UNAVAILABLE",
        });
        return;
      }

      console.error("[RecoveryController] Unexpected error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during recovery evaluation",
        error: "INTERNAL_ERROR",
      });
    }
  }
}

export const recoveryController = new RecoveryController();
