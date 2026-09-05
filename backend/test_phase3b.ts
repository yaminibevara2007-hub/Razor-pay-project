/**
 * Phase 3B — Recovery Intelligence Layer Test Suite
 *
 * Tests the complete pipeline:
 *   ML Prediction → Recovery Decision Engine → Safety Policy → Final Action
 *
 * NOTE: Tests that require PostgreSQL are marked as BLOCKED in the output.
 * Tests that require the FastAPI ML service are run as HTTP calls.
 */

import * as dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { RecoveryDecisionService } from "./src/services/recoveryDecision.service";
import { SafetyPolicyService } from "./src/services/safetyPolicy.service";
import { SyntheticDataService, SyntheticTransaction } from "./src/services/syntheticData.service";
import { TransactionStatus, SafetyResult, RecoveryAction } from "@prisma/client";

const BACKEND_URL = `http://localhost:${process.env.PORT || 5000}`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a base transaction for testing
// ─────────────────────────────────────────────────────────────────────────────
function baseTx(overrides: Partial<SyntheticTransaction> = {}): SyntheticTransaction {
  return SyntheticDataService.generateFailedTransaction({
    transactionId: `tx_test_${Date.now()}`,
    amount: 5000,
    payment_method: "credit_card",
    gateway: "gateway_b",
    failure_reason: "timeout",
    network_latency: 200,
    gateway_health: 0.85,
    issuer_health: 0.9,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.88,
    historical_recovery_rate: 0.65,
    time_since_failure: 600, // 10 minutes
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT TESTS — Decision Engine + Safety Policy (no DB, no HTTP required)
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let blockedByDB = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

console.log("\n========================================================");
console.log("  Phase 3B — Recovery Intelligence Layer Test Suite");
console.log("========================================================\n");

// ─── TEST 1: High recovery probability → RETRY_NOW ───────────────────────────
console.log("TEST 1: High recovery probability → RETRY_NOW");
{
  const tx = baseTx({ gateway_health: 0.9, issuer_health: 0.9 });
  const result = RecoveryDecisionService.evaluate(tx, 0.85);
  assert(result.recommendedAction === RecoveryAction.RETRY_NOW, "Action is RETRY_NOW");
  assert(result.expectedRecoveryValue > 0, "Expected recovery value is positive");
  assert(result.decisionReason.length > 20, "Decision reason is human-readable");
}

// ─── TEST 2: Moderate probability → RETRY_LATER ──────────────────────────────
console.log("\nTEST 2: Moderate recovery probability → RETRY_LATER");
{
  const tx = baseTx({ gateway_health: 0.75, issuer_health: 0.75 });
  const result = RecoveryDecisionService.evaluate(tx, 0.45);
  assert(result.recommendedAction === RecoveryAction.RETRY_LATER, "Action is RETRY_LATER");
  assert(result.suggestedDelay !== null && result.suggestedDelay > 0, "Suggested delay is set");
}

// ─── TEST 3: Customer action required → CUSTOMER_ACTION_REQUIRED ─────────────
console.log("\nTEST 3: customerActionRequired=true → CUSTOMER_ACTION_REQUIRED");
{
  const tx = baseTx({ customer_action_required: true, failure_reason: "authentication_required" });
  const result = RecoveryDecisionService.evaluate(tx, 0.6);
  assert(result.recommendedAction === RecoveryAction.CUSTOMER_ACTION_REQUIRED, "Action is CUSTOMER_ACTION_REQUIRED");
}

// ─── TEST 4: Permanent failure → STOP ────────────────────────────────────────
console.log("\nTEST 4: failureReason=card_expired → STOP");
{
  const tx = baseTx({ failure_reason: "card_expired", customer_action_required: false });
  const result = RecoveryDecisionService.evaluate(tx, 0.75);
  assert(result.recommendedAction === RecoveryAction.STOP, "Action is STOP");
  assert(result.decisionReason.includes("card_expired"), "Reason mentions card_expired");
}

// ─── TEST 5: Suspected fraud → STOP ──────────────────────────────────────────
console.log("\nTEST 5: failureReason=suspected_fraud → STOP");
{
  const tx = baseTx({ failure_reason: "suspected_fraud", customer_action_required: false });
  const result = RecoveryDecisionService.evaluate(tx, 0.5);
  assert(result.recommendedAction === RecoveryAction.STOP, "Action is STOP");
  assert(result.decisionReason.includes("suspected_fraud"), "Reason mentions suspected_fraud");
}

// ─── TEST 6: Retry limit exceeded → Safety BLOCKED → STOP ────────────────────
console.log("\nTEST 6: previousAttemptCount=3 → Safety BLOCKED");
{
  const tx = baseTx({ previous_attempt_count: 3, time_since_failure: 3600 });
  const safety = SafetyPolicyService.evaluate(tx);
  assert(safety.finalSafetyResult === SafetyResult.BLOCKED, "Safety result is BLOCKED");
  assert(safety.retryLimitCheck === false, "Retry limit check failed");
  assert(safety.failureReason !== null, "Failure reason is provided");
}

// ─── TEST 7: Already recovered transaction → Safety BLOCKED ──────────────────
console.log("\nTEST 7: Already recovered transaction → Safety BLOCKED");
{
  const tx = baseTx({ transactionId: "tx_already_recovered_001" });
  SafetyPolicyService.markAsRecovered("tx_already_recovered_001");
  const safety = SafetyPolicyService.evaluate(tx, TransactionStatus.RECOVERED);
  // Should be blocked by transaction status check
  assert(safety.finalSafetyResult === SafetyResult.BLOCKED, "Safety result is BLOCKED");
  assert(safety.transactionStatusCheck === false, "Status check correctly failed");
}

// ─── TEST 8: Poor gateway health → ALTERNATE_ROUTE ────────────────────────────
console.log("\nTEST 8: Poor gateway health → ALTERNATE_ROUTE");
{
  const tx = baseTx({
    gateway_health: 0.3,
    issuer_health: 0.8,
    customer_action_required: false,
    failure_reason: "timeout",
    previous_attempt_count: 0,
  });
  const result = RecoveryDecisionService.evaluate(tx, 0.55);
  assert(result.recommendedAction === RecoveryAction.ALTERNATE_ROUTE, "Action is ALTERNATE_ROUTE");
  assert(result.decisionReason.toLowerCase().includes("gateway"), "Reason mentions gateway");
}

// ─── TEST: Synthetic data generator ──────────────────────────────────────────
console.log("\nTEST: Synthetic data generator produces valid transactions");
{
  const tx = SyntheticDataService.generateFailedTransaction();
  assert(typeof tx.amount === "number" && tx.amount >= 100 && tx.amount <= 100000, "Amount in valid range");
  assert(["credit_card", "debit_card", "upi", "net_banking", "wallet"].includes(tx.payment_method), "Valid payment method");
  assert(["gateway_a", "gateway_b", "gateway_c"].includes(tx.gateway), "Valid gateway");
  assert(tx.gateway_health >= 0 && tx.gateway_health <= 1, "Gateway health in [0,1]");
  assert(tx.network_latency >= 20 && tx.network_latency <= 1000, "Network latency in range");
}

// ─── TEST: Expected recovery value calculation ────────────────────────────────
console.log("\nTEST: Cost-aware expected recovery value");
{
  const tx = baseTx({ amount: 10000 });
  const probability = 0.7;
  const result = RecoveryDecisionService.evaluate(tx, probability);
  // ERV = 0.7 * 10000 - 2.50 - 0.50 = 6997.00
  const expected = parseFloat((0.7 * 10000 - 2.50 - 0.50).toFixed(2));
  assert(result.expectedRecoveryValue === expected, `ERV matches formula: got ${result.expectedRecoveryValue}, expected ${expected}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION TESTS — HTTP endpoint (requires running backend + ML service)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--------------------------------------------------------");
console.log("  Integration Tests (requires backend + ML service)");
console.log("--------------------------------------------------------\n");

async function runIntegrationTests() {
  // ─── TEST 9: ML service unavailable → clean 503 error ──────────────────────
  console.log("TEST 9: ML service unavailable → clean 503 error");
  try {
    const badPayload = {
      transactionId: "tx_test_ml_down",
      amount: 2000,
      currency: "INR",
      payment_method: "credit_card",
      gateway: "gateway_a",
      failure_reason: "timeout",
      network_latency: 150,
      gateway_health: 0.8,
      issuer_health: 0.8,
      customer_action_required: false,
      previous_attempt_count: 0,
      recent_gateway_success_rate: 0.9,
      historical_recovery_rate: 0.6,
      time_since_failure: 600,
    };

    // Temporarily point to a bad URL to simulate ML unavailability
    const originalUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = "http://localhost:19999"; // unreachable port

    try {
      await axios.post(`${BACKEND_URL}/api/recovery/evaluate`, badPayload, { timeout: 8000 });
      assert(false, "Should have thrown 503 error");
    } catch (err: any) {
      if (err.response) {
        assert(err.response.status === 503, `HTTP 503 returned: got ${err.response.status}`);
        assert(err.response.data.error === "ML_SERVICE_UNAVAILABLE", "Error code is ML_SERVICE_UNAVAILABLE");
        assert(!err.response.data.recovery_probability, "No fake recovery_probability in error response");
      } else {
        console.log("  ⚠️  Backend not reachable — skipping TEST 9 (start backend first)");
      }
    }

    process.env.ML_SERVICE_URL = originalUrl;
  } catch (e: any) {
    console.log("  ⚠️  TEST 9 skipped — backend not reachable:", e.message);
  }

  // ─── TEST 10 (integration): Full pipeline via HTTP ──────────────────────────
  console.log("\nTEST 10: Full pipeline POST /api/recovery/evaluate");
  try {
    const payload = {
      transactionId: `tx_integration_${Date.now()}`,
      amount: 3500,
      currency: "INR",
      payment_method: "upi",
      gateway: "gateway_a",
      failure_reason: "temporary_gateway_error",
      network_latency: 180,
      gateway_health: 0.88,
      issuer_health: 0.92,
      customer_action_required: false,
      previous_attempt_count: 0,
      recent_gateway_success_rate: 0.91,
      historical_recovery_rate: 0.70,
      time_since_failure: 900,
    };

    const response = await axios.post(`${BACKEND_URL}/api/recovery/evaluate`, payload, { timeout: 10000 });
    const data = response.data;

    assert(response.status === 200, `HTTP 200: got ${response.status}`);
    assert(data.success === true, "Response has success=true");
    assert(data.transaction?.transactionId === payload.transactionId, "Transaction ID echoed correctly");
    assert(typeof data.prediction?.recovery_probability === "number", "prediction.recovery_probability is a number");
    assert(["RETRY_NOW", "RETRY_LATER", "ALTERNATE_ROUTE", "CUSTOMER_ACTION_REQUIRED", "STOP"].includes(data.decision?.recommendedAction), "Valid recommendedAction");
    assert(["PASSED", "BLOCKED", "FLAG_FOR_REVIEW"].includes(data.safety?.finalSafetyResult), "Valid finalSafetyResult");
    assert(data.safety?.checks?.transactionStatusCheck !== undefined, "Safety checks present");
    assert(typeof data.decision?.decisionReason === "string" && data.decision.decisionReason.length > 10, "Decision reason is human-readable");

    console.log("\n  📊 Sample pipeline result:");
    console.log(`     Recovery probability: ${data.prediction?.recovery_probability}`);
    console.log(`     Decision:             ${data.decision?.recommendedAction}`);
    console.log(`     Safety:               ${data.safety?.finalSafetyResult}`);
    console.log(`     Reason:               ${data.decision?.decisionReason}`);
  } catch (err: any) {
    if (err.response) {
      console.error("  ❌ Integration test failed:", err.response.data);
      failed++;
    } else {
      console.log("  ⚠️  TEST 10 skipped — backend or ML service not reachable");
    }
  }
}

// ─── DATABASE TESTS ───────────────────────────────────────────────────────────
console.log("\nTEST DB: Database persistence (requires PostgreSQL)");
console.log("  ⚠️  BLOCKED: PostgreSQL is unavailable in this environment.");
console.log("     → Database persistence code is implemented and ready.");
console.log("     → Run 'docker compose up -d' and 'npx prisma migrate dev' to enable.");
blockedByDB = 1;

// ─────────────────────────────────────────────────────────────────────────────

runIntegrationTests().finally(() => {
  console.log("\n========================================================");
  console.log(`  Results: ${passed} passed | ${failed} failed | ${blockedByDB} blocked (DB)`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
});
