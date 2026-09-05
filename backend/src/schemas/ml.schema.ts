import { z } from 'zod';

export const mlPredictionRequestSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.string().min(1),
  gateway: z.string().min(1),
  failure_reason: z.string().min(1),
  network_latency: z.number().nonnegative(),
  gateway_health: z.number().min(0).max(1),
  issuer_health: z.number().min(0).max(1),
  previous_attempt_count: z.number().int().nonnegative(),
  recent_gateway_success_rate: z.number().min(0).max(1),
  historical_recovery_rate: z.number().min(0).max(1),
  time_since_failure: z.number().nonnegative(),
  customer_action_required: z.boolean(),
});

export type MlPredictionRequestInput = z.infer<typeof mlPredictionRequestSchema>;
