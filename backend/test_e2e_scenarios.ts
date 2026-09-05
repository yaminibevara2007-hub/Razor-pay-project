/**
 * Automated End-to-End Scenario Test Suite
 * Tests 6 critical failure and recovery scenarios across the full stack:
 * 1. Permanent Failure (card_expired) -> Engine STOP, Safety PASSED
 * 2. Suspected Fraud (suspected_fraud) -> Engine STOP, Safety BLOCKED
 * 3. Customer Intervention (insufficient_funds) -> Engine CUSTOMER_ACTION_REQUIRED
 * 4. Degraded Route (gateway_timeout + gateway_health 0.35) -> Engine ALTERNATE_ROUTE
 * 5. Optimal Transient (gateway_timeout + gateway_health 0.85 + P >= 0.70) -> Engine RETRY_NOW
 * 6. Safety Limit Breached (previous_attempt_count = 3) -> Safety Policy BLOCKED
 */

import axios from "axios";

const API_BASE = "http://localhost:5000/api";
const ML_BASE = "http://localhost:8001";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, details?: any) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${name}`, details ? JSON.stringify(details) : "");
    failed++;
  }
}

async function runScenarioTests() {
  console.log("==========================================================");
  console.log(" AI REVENUE RECOVERY ENGINE - E2E SCENARIO TEST SUITE");
  console.log("==========================================================\n");

  // Health Checks
  console.log("--- 0. Pre-Flight Health Checks ---");
  const beHealth = await axios.get(`${API_BASE}/health`);
  assert(beHealth.data.success === true, "Backend API is healthy");

  const mlHealth = await axios.get(`${ML_BASE}/health`);
  assert(mlHealth.data.success === true && mlHealth.data.model.trained === true, "ML Inference Service is healthy & trained model loaded");

  // Scenario 1: Permanent Error (card_expired)
  console.log("\n--- Scenario 1: Permanent Failure (card_expired) ---");
  const s1Tx = {
    transactionId: `tx_sc1_${Date.now()}`,
    amount: 1500,
    currency: "INR",
    payment_method: "card",
    gateway: "gateway_a",
    failure_reason: "card_expired",
    network_latency: 220,
    gateway_health: 0.9,
    issuer_health: 0.9,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.95,
    historical_recovery_rate: 0.1,
    time_since_failure: 120,
  };
  const s1Res = await axios.post(`${API_BASE}/simulator/evaluate`, s1Tx);
  assert(s1Res.data.success === true, "Scenario 1 evaluation returned HTTP 200");
  assert(s1Res.data.decision.recommendedAction === "STOP", "Scenario 1 recommends STOP on card_expired", s1Res.data.decision);
  assert(s1Res.data.safety.finalSafetyResult === "PASSED", "Scenario 1 passes safety policy (no dangerous retries attempted)");

  // Scenario 2: Suspected Fraud (suspected_fraud)
  console.log("\n--- Scenario 2: Risk Vector (suspected_fraud) ---");
  const s2Tx = {
    transactionId: `tx_sc2_${Date.now()}`,
    amount: 25000,
    currency: "INR",
    payment_method: "card",
    gateway: "gateway_b",
    failure_reason: "suspected_fraud",
    network_latency: 350,
    gateway_health: 0.8,
    issuer_health: 0.8,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.85,
    historical_recovery_rate: 0.05,
    time_since_failure: 60,
  };
  const s2Res = await axios.post(`${API_BASE}/simulator/evaluate`, s2Tx);
  assert(s2Res.data.success === true, "Scenario 2 evaluation returned HTTP 200");
  assert(s2Res.data.decision.recommendedAction === "STOP", "Scenario 2 recommends STOP on suspected_fraud", s2Res.data.decision);
  assert(s2Res.data.safety.finalSafetyResult === "BLOCKED", "Scenario 2 safety policy BLOCKED execution due to fraud risk", s2Res.data.safety);

  // Scenario 3: Customer Intervention (insufficient_funds)
  console.log("\n--- Scenario 3: Customer Action Needed (insufficient_funds) ---");
  const s3Tx = {
    transactionId: `tx_sc3_${Date.now()}`,
    amount: 3200,
    currency: "INR",
    payment_method: "upi",
    gateway: "gateway_a",
    failure_reason: "insufficient_funds",
    network_latency: 180,
    gateway_health: 0.95,
    issuer_health: 0.95,
    customer_action_required: true,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.9,
    historical_recovery_rate: 0.4,
    time_since_failure: 150,
  };
  const s3Res = await axios.post(`${API_BASE}/simulator/evaluate`, s3Tx);
  assert(s3Res.data.success === true, "Scenario 3 evaluation returned HTTP 200");
  assert(
    s3Res.data.decision.recommendedAction === "CUSTOMER_ACTION_REQUIRED",
    "Scenario 3 recommends CUSTOMER_ACTION_REQUIRED instead of silent retry",
    s3Res.data.decision
  );

  // Scenario 4: Degraded Primary Gateway (gateway_health 0.35)
  console.log("\n--- Scenario 4: Degraded Primary Gateway (Route Shifting) ---");
  const s4Tx = {
    transactionId: `tx_sc4_${Date.now()}`,
    amount: 8500,
    currency: "INR",
    payment_method: "netbanking",
    gateway: "gateway_a",
    failure_reason: "gateway_timeout",
    network_latency: 1800,
    gateway_health: 0.35, // Degraded!
    issuer_health: 0.85,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.45,
    historical_recovery_rate: 0.6,
    time_since_failure: 400,
  };
  const s4Res = await axios.post(`${API_BASE}/simulator/evaluate`, s4Tx);
  assert(s4Res.data.success === true, "Scenario 4 evaluation returned HTTP 200");
  assert(
    s4Res.data.decision.recommendedAction === "ALTERNATE_ROUTE",
    "Scenario 4 recommends ALTERNATE_ROUTE away from degraded gateway_a",
    s4Res.data.decision
  );

  // Scenario 5: Optimal Transient Timeout (High Gateway Health, High ML Probability)
  console.log("\n--- Scenario 5: Optimal Transient (Immediate Retry) ---");
  const s5Tx = {
    transactionId: `tx_sc5_${Date.now()}`,
    amount: 4500,
    currency: "INR",
    payment_method: "card",
    gateway: "gateway_b",
    failure_reason: "gateway_timeout",
    network_latency: 120,
    gateway_health: 0.95,
    issuer_health: 0.95,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.98,
    historical_recovery_rate: 0.85,
    time_since_failure: 350,
  };
  const s5Res = await axios.post(`${API_BASE}/simulator/evaluate`, s5Tx);
  assert(s5Res.data.success === true, "Scenario 5 evaluation returned HTTP 200");
  assert(
    s5Res.data.decision.recommendedAction === "RETRY_NOW" || s5Res.data.decision.recommendedAction === "RETRY_LATER",
    "Scenario 5 recommends active retry (RETRY_NOW or RETRY_LATER)",
    s5Res.data.decision
  );
  assert(s5Res.data.decision.expectedRecoveryValue > 0, "Scenario 5 produces positive Expected Recovery Value", {
    ERV: s5Res.data.decision.expectedRecoveryValue,
  });

  // Scenario 6: Safety Policy Breach (Exceeded Max Retries = 3)
  console.log("\n--- Scenario 6: Safety Invariant (Max Retries Exceeded) ---");
  const s6Tx = {
    transactionId: `tx_sc6_${Date.now()}`,
    amount: 5000,
    currency: "INR",
    payment_method: "card",
    gateway: "gateway_a",
    failure_reason: "gateway_timeout",
    network_latency: 200,
    gateway_health: 0.9,
    issuer_health: 0.9,
    customer_action_required: false,
    previous_attempt_count: 3, // Already retried 3 times!
    recent_gateway_success_rate: 0.9,
    historical_recovery_rate: 0.7,
    time_since_failure: 600,
  };
  const s6Res = await axios.post(`${API_BASE}/simulator/evaluate`, s6Tx);
  assert(s6Res.data.success === true, "Scenario 6 evaluation returned HTTP 200");
  assert(
    s6Res.data.safety.finalSafetyResult === "BLOCKED" && s6Res.data.safety.checks.retryLimitCheck === false,
    "Scenario 6 Safety Policy strictly BLOCKED attempt after 3 previous retries",
    s6Res.data.safety
  );

  // Simulated Execution Verification
  console.log("\n--- Scenario 7: Execution Simulation ---");
  const s7Exec = await axios.post(`${API_BASE}/simulator/execute`, {
    transaction: s5Tx,
    decision: s5Res.data.decision,
    prediction: s5Res.data.prediction,
  });
  assert(s7Exec.data.success === true, "Simulation execution returned HTTP 200");
  assert(s7Exec.data.execution.simulated === true, "Execution record explicitly marked simulated: true");
  assert(
    s7Exec.data.execution.outcome === "SUCCESS" || s7Exec.data.execution.outcome === "FAILURE",
    "Execution produced valid outcome (SUCCESS/FAILURE)",
    s7Exec.data.execution
  );

  console.log("\n==========================================================");
  console.log(` TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runScenarioTests().catch((err) => {
  console.error("Test execution failed with error:", err.message);
  process.exit(1);
});
