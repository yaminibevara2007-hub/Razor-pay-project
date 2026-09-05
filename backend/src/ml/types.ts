export interface PredictionRequest {
  amount: number;
  payment_method: string;
  gateway: string;
  failure_reason: string;
  network_latency: number;
  gateway_health: number;
  issuer_health: number;
  previous_attempt_count: number;
  recent_gateway_success_rate: number;
  historical_recovery_rate: number;
  time_since_failure: number;
  customer_action_required: boolean;
}

export interface PredictionResponse {
  recovery_probability: number;
  model_name: string;
  model_version: string;
}
