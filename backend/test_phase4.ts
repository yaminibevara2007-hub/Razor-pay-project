/**
 * Phase 4 — Comprehensive Test Suite for AI Revenue Recovery Engine
 * 
 * Verifies:
 * 1. High probability + healthy gateway → RETRY_NOW
 * 2. Moderate probability → RETRY_LATER
 * 3. Poor gateway health → ALTERNATE_ROUTE
 * 4. Customer action required → CUSTOMER_ACTION_REQUIRED
 * 5. Card expired → STOP
 * 6. Suspected fraud → STOP
 * 7. Retry limit reached → STOP
 * 8. Negative ERV → STOP
 * 9. Safety check failure → BLOCKED (overrides to STOP)
 * 10. All safety checks pass → execution may proceed
 * 11. Simulated recovery execution (simulated=true, deterministic outcome)
 * 12. Experiment engine running 5 strategies on synthetic dataset
 */

import * as dotenv from "dotenv";
dotenv.config();

import { RecoveryDecisionService } from "./src/services/recoveryDecision.service";
import { SafetyPolicyService } from "./src/services/safetyPolicy.service";
import { SyntheticDataService, SyntheticTransaction } from "./src/services/syntheticData.service";
import { RecoveryExecutionService } from "./src/services/recoveryExecution.service";
import { ExperimentService } from "./src/services/experiment.service";
import { TransactionStatus, SafetyResult, RecoveryAction } from "@prisma/client";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function baseTx(overrides: Partial<SyntheticTransaction> = {}): SyntheticTransaction {
  return SyntheticDataService.generateFailedTransaction({
    transactionId: `tx_p4_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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

console.log("\n========================================================");
console.log("  Phase 4 — Core Verification & Test Suite");
console.log("========================================================\n");

// ── 1. High probability + healthy gateway → RETRY_NOW
console.log("TEST 1: High probability + healthy gateway → RETRY_NOW");
{
  const tx = baseTx({ gateway_health: 0.9, issuer_health: 0.9 });
  const res = RecoveryDecisionService.evaluate(tx, 0.85);
  assert(res.recommendedAction === RecoveryAction.RETRY_NOW, "Action is RETRY_NOW");
  assert(res.expectedRecoveryValue > 0, "ERV is positive");
  assert(res.decisionReason.length > 10, "Decision reason provided");
}

// ── 2. Moderate probability → RETRY_LATER
console.log("\nTEST 2: Moderate probability → RETRY_LATER");
{
  const tx = baseTx({ gateway_health: 0.75, issuer_health: 0.75 });
  const res = RecoveryDecisionService.evaluate(tx, 0.45);
  assert(res.recommendedAction === RecoveryAction.RETRY_LATER, "Action is RETRY_LATER");
  assert(res.suggestedDelay !== null && res.suggestedDelay > 0, "Suggested delay provided");
}

// ── 3. Poor gateway health → ALTERNATE_ROUTE
console.log("\nTEST 3: Poor gateway health → ALTERNATE_ROUTE");
{
  const tx = baseTx({ gateway_health: 0.3, issuer_health: 0.8, customer_action_required: false });
  const res = RecoveryDecisionService.evaluate(tx, 0.55);
  assert(res.recommendedAction === RecoveryAction.ALTERNATE_ROUTE, "Action is ALTERNATE_ROUTE");
  assert(res.decisionReason.toLowerCase().includes("gateway"), "Mentions gateway in reason");
}

// ── 4. Customer action required → CUSTOMER_ACTION_REQUIRED
console.log("\nTEST 4: Customer action required → CUSTOMER_ACTION_REQUIRED");
{
  const tx = baseTx({ customer_action_required: true, failure_reason: "authentication_required" });
  const res = RecoveryDecisionService.evaluate(tx, 0.6);
  assert(res.recommendedAction === RecoveryAction.CUSTOMER_ACTION_REQUIRED, "Action is CUSTOMER_ACTION_REQUIRED");
}

// ── 5. Card expired → STOP
console.log("\nTEST 5: Card expired → STOP");
{
  const tx = baseTx({ failure_reason: "card_expired", customer_action_required: false });
  const res = RecoveryDecisionService.evaluate(tx, 0.8);
  assert(res.recommendedAction === RecoveryAction.STOP, "Action is STOP for card_expired");
}

// ── 6. Suspected fraud → STOP
console.log("\nTEST 6: Suspected fraud → STOP");
{
  const tx = baseTx({ failure_reason: "suspected_fraud", customer_action_required: false });
  const res = RecoveryDecisionService.evaluate(tx, 0.5);
  assert(res.recommendedAction === RecoveryAction.STOP, "Action is STOP for suspected_fraud");
}

// ── 7. Retry limit reached → STOP
console.log("\nTEST 7: Retry limit reached (>=3) → STOP");
{
  const tx = baseTx({ previous_attempt_count: 3 });
  const res = RecoveryDecisionService.evaluate(tx, 0.75);
  assert(res.recommendedAction === RecoveryAction.STOP, "Decision engine returns STOP on max attempts");
}

// ── 8. Negative ERV → STOP
console.log("\nTEST 8: Negative ERV → STOP");
{
  // amount = 2, prob = 0.5 -> ERV = 1 - 2.50 - 0.50 = -2.00 <= 0
  const tx = baseTx({ amount: 2.0 });
  const res = RecoveryDecisionService.evaluate(tx, 0.5);
  assert(res.recommendedAction === RecoveryAction.STOP, "Action is STOP for negative/non-positive ERV");
  assert(res.expectedRecoveryValue <= 0, "ERV is negative/zero");
}

// ── 9. Safety check failure → BLOCKED
console.log("\nTEST 9: Safety check failure on attempt limit → BLOCKED");
{
  const tx = baseTx({ previous_attempt_count: 3, time_since_failure: 3600 });
  const safety = SafetyPolicyService.evaluate(tx);
  assert(safety.finalSafetyResult === SafetyResult.BLOCKED, "Safety result is BLOCKED");
  assert(safety.retryLimitCheck === false, "retryLimitCheck is false");
  assert(safety.failureReason !== null, "failureReason is set");
}

// ── 10. All safety checks pass → PASSED
console.log("\nTEST 10: Valid fresh transaction passes safety checks");
{
  const tx = baseTx({ previous_attempt_count: 0, time_since_failure: 1200 });
  const safety = SafetyPolicyService.evaluate(tx);
  assert(safety.finalSafetyResult === SafetyResult.PASSED, "Safety result is PASSED");
  assert(safety.retryLimitCheck === true, "retryLimitCheck is true");
  assert(safety.cooldownCheck === true, "cooldownCheck is true");
}

// ── 11. Simulated recovery execution
console.log("\nTEST 11: Simulated recovery execution is explicitly simulated=true");
async function testExecution() {
  const tx = baseTx({ amount: 1500 });
  const decision = {
    recommendedAction: RecoveryAction.RETRY_NOW,
    suggestedDelay: null,
    expectedRecoveryValue: 1000,
    decisionReason: "High probability retry",
  };
  const exec = await RecoveryExecutionService.execute(tx, decision, 0.85, 1);
  assert(exec.simulated === true, "Execution is explicitly marked simulated=true");
  assert(["SUCCESS", "FAILURE"].includes(exec.outcome), "Outcome is SUCCESS or FAILURE");
  assert(exec.action === RecoveryAction.RETRY_NOW, "Action matches decision");
}

// ── 12. Experiment engine evaluation
console.log("\nTEST 12: Experiment engine runs 5 strategies on dataset");
async function testExperiment() {
  const results = await ExperimentService.runExperiment(100, "unit_test_run");
  assert(results.length === 5, "Generated results for 5 strategies");
  const strategies = results.map(r => r.strategy);
  assert(strategies.includes("NO_RETRY"), "Contains NO_RETRY strategy");
  assert(strategies.includes("FIXED_RETRY"), "Contains FIXED_RETRY strategy");
  assert(strategies.includes("RULE_BASED"), "Contains RULE_BASED strategy");
  assert(strategies.includes("ML_BASED"), "Contains ML_BASED strategy");
  assert(strategies.includes("ADAPTIVE_RECOVERY"), "Contains ADAPTIVE_RECOVERY strategy");
  const noRetry = results.find(r => r.strategy === "NO_RETRY");
  assert(noRetry?.recoveryRate === 0, "NO_RETRY has 0 recovery rate");
}

async function runAll() {
  await testExecution();
  await testExperiment();

  console.log("\n========================================================");
  console.log(`  Phase 4 Suite Results: ${passed} passed | ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
