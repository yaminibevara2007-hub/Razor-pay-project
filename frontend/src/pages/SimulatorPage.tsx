import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { generateSyntheticTx, evaluateRecovery, executeRecovery } from "../api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormState {
  transactionId: string;
  amount: number;
  currency: string;
  payment_method: string;
  gateway: string;
  failure_reason: string;
  network_latency: number;
  gateway_health: number;
  issuer_health: number;
  customer_action_required: boolean;
  previous_attempt_count: number;
  recent_gateway_success_rate: number;
  historical_recovery_rate: number;
  time_since_failure: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function actionLabel(raw: string): string {
  const map: Record<string, string> = {
    RETRY_NOW: "Retry Now",
    RETRY_LATER: "Retry Later",
    ALTERNATE_ROUTE: "Try Alternate Payment Route",
    CUSTOMER_ACTION_REQUIRED: "Customer Action Required",
    STOP: "Stop — No Recovery",
    FLAG_FOR_REVIEW: "Flag for Manual Review",
  };
  return map[raw] || raw;
}

function actionExplanation(action: string, reason: string): string {
  if (action === "RETRY_NOW")
    return "The payment failure appears to be a temporary network glitch. Based on current gateway conditions, retrying immediately has a good chance of succeeding.";
  if (action === "RETRY_LATER")
    return "The payment failed due to temporary conditions. Waiting a short time before retrying improves the chance of recovery without wasting retries.";
  if (action === "ALTERNATE_ROUTE")
    return "The current payment gateway seems to be experiencing issues. Routing this payment through a different gateway may succeed.";
  if (action === "CUSTOMER_ACTION_REQUIRED")
    return "This failure requires the customer to take action — such as completing a security verification or updating their payment details.";
  if (action === "STOP")
    return "This failure appears to be permanent (e.g., expired card or suspected fraud). Further retry attempts are unlikely to succeed and would waste resources.";
  return reason || "The recovery engine evaluated multiple factors and selected this action.";
}

function safetyExplanation(passed: boolean, failureReason?: string): string {
  if (passed)
    return "All safety checks passed. The system determined it is safe to proceed with the recommended recovery action.";
  return failureReason || "One or more safety checks failed, blocking the recovery attempt.";
}

function checkLabel(key: string): string {
  const map: Record<string, string> = {
    retryLimit: "Retry Limit",
    cooldown: "Cooldown Period",
    duplicateCheck: "Duplicate Check",
    idempotency: "Idempotency",
    riskThreshold: "Risk Threshold",
    permanentFailure: "Permanent Failure Check",
  };
  return map[key] || key;
}

// ─── Step indicator ────────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number }> = ({ current }) => {
  const steps = [
    "Payment Details",
    "Recovery Analysis",
    "Safety Check",
    "Run Simulation",
  ];
  return (
    <div className="step-indicator">
      {steps.map((label, i) => {
        const num = i + 1;
        const isDone = num < current;
        const isActive = num === current;
        return (
          <React.Fragment key={num}>
            <div className="step-item">
              <div
                className={`step-circle ${isDone ? "step-circle-done" : isActive ? "step-circle-active" : "step-circle-pending"}`}
              >
                {isDone ? <CheckCircle2 size={13} /> : num}
              </div>
              <span
                className={`step-label ${isDone ? "step-label-done" : isActive ? "step-label-active" : "step-label-pending"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-connector ${isDone ? "step-connector-done" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const SimulatorPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingEvaluate, setLoadingEvaluate] = useState(false);
  const [loadingExecute, setLoadingExecute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    transactionId: `tx_sim_${Date.now()}`,
    amount: 2500,
    currency: "USD",
    payment_method: "card",
    gateway: "gateway_a",
    failure_reason: "gateway_timeout",
    network_latency: 280,
    gateway_health: 0.85,
    issuer_health: 0.9,
    customer_action_required: false,
    previous_attempt_count: 0,
    recent_gateway_success_rate: 0.92,
    historical_recovery_rate: 0.68,
    time_since_failure: 300,
  });

  const [evaluation, setEvaluation] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);

  const set = (key: keyof FormState, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Step 1 actions ─────────────────────────────────────────────────────────
  const handleRandomize = async () => {
    setLoadingGenerate(true);
    setError(null);
    try {
      const res = await generateSyntheticTx();
      if (res.success && res.transaction) {
        setForm({ ...res.transaction, currency: res.transaction.currency || "USD" });
        setEvaluation(null);
        setExecution(null);
        setStep(1);
      }
    } catch {
      setError("Failed to generate random transaction. Is the backend running?");
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEvaluate(true);
    setError(null);
    setExecution(null);
    try {
      const res = await evaluateRecovery(form);
      if (res.success) {
        setEvaluation(res);
        setStep(2);
      } else {
        setError(res.message || "Recovery evaluation failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Evaluation failed.");
    } finally {
      setLoadingEvaluate(false);
    }
  };

  const handleExecute = async () => {
    if (!evaluation) return;
    setLoadingExecute(true);
    setError(null);
    try {
      const res = await executeRecovery({
        transaction: form,
        decision: evaluation.decision,
        prediction: evaluation.prediction,
      });
      if (res.success) {
        setExecution(res.execution);
        setStep(4);
      } else {
        setError(res.message || "Simulated execution failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Execution failed.");
    } finally {
      setLoadingExecute(false);
    }
  };

  const handleReset = () => {
    setEvaluation(null);
    setExecution(null);
    setStep(1);
    setError(null);
    setForm({
      transactionId: `tx_sim_${Date.now()}`,
      amount: 2500,
      currency: "USD",
      payment_method: "card",
      gateway: "gateway_a",
      failure_reason: "gateway_timeout",
      network_latency: 280,
      gateway_health: 0.85,
      issuer_health: 0.9,
      customer_action_required: false,
      previous_attempt_count: 0,
      recent_gateway_success_rate: 0.92,
      historical_recovery_rate: 0.68,
      time_since_failure: 300,
    });
  };

  const safetyPassed = evaluation?.safety?.finalSafetyResult === "PASSED";
  const probPct = evaluation ? Math.round(evaluation.prediction.recovery_probability * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 className="page-title">Payment Recovery Simulator</h1>
            <p className="page-subtitle">Simulate a failed payment and see how the recovery engine makes its decision.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleRandomize}
              disabled={loadingGenerate}
            >
              <Sparkles size={13} />
              {loadingGenerate ? "Generating..." : "Random Transaction"}
            </button>
            {step > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>
                <RotateCcw size={13} />
                Start Over
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* Error */}
      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ══════════════ STEP 1: PAYMENT DETAILS ══════════════ */}
      {step === 1 && (
        <form onSubmit={handleAnalyze} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card">
            <p className="card-title" style={{ marginBottom: 16 }}>Step 1 — Payment Failure Details</p>

            {/* Main inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="form-label">Transaction Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)} className="form-select">
                  <option value="card">Card</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="wallet">Wallet</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Failure Reason</label>
                <select value={form.failure_reason} onChange={(e) => set("failure_reason", e.target.value)} className="form-select">
                  <option value="insufficient_funds">Insufficient Funds</option>
                  <option value="network_error">Network Error</option>
                  <option value="gateway_timeout">Gateway Timeout</option>
                  <option value="timeout">Timeout</option>
                  <option value="issuer_declined">Issuer Declined</option>
                  <option value="rate_limit">Rate Limit</option>
                  <option value="temporary_gateway_error">Temporary Gateway Error</option>
                  <option value="authentication_failed">Authentication Failed</option>
                  <option value="authentication_required">Authentication Required</option>
                  <option value="card_expired">Card Expired (Permanent failure)</option>
                  <option value="suspected_fraud">Suspected Fraud (Permanent failure)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Previous Retry Attempts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={form.previous_attempt_count}
                  onChange={(e) => set("previous_attempt_count", parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={form.customer_action_required}
                    onChange={(e) => set("customer_action_required", e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Customer Action Required
                </label>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  e.g. 3D Secure challenge, OTP
                </p>
              </div>
            </div>

            {/* Advanced section */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                className="expand-trigger"
                onClick={() => setAdvancedOpen(!advancedOpen)}
              >
                {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {advancedOpen ? "Hide" : "Show"} Advanced Payment Details
              </button>

              {advancedOpen && (
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">Payment Gateway</label>
                    <select value={form.gateway} onChange={(e) => set("gateway", e.target.value)} className="form-select">
                      <option value="gateway_a">Gateway A</option>
                      <option value="gateway_b">Gateway B</option>
                      <option value="gateway_c">Gateway C</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Network Latency (ms)</label>
                    <input
                      type="number"
                      value={form.network_latency}
                      onChange={(e) => set("network_latency", parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Time Since Failure (s)</label>
                    <input
                      type="number"
                      value={form.time_since_failure}
                      onChange={(e) => set("time_since_failure", parseInt(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Gateway Health (0–1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.gateway_health}
                      onChange={(e) => set("gateway_health", parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Issuer Health (0–1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.issuer_health}
                      onChange={(e) => set("issuer_health", parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Gateway Success Rate (0–1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.recent_gateway_success_rate}
                      onChange={(e) => set("recent_gateway_success_rate", parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Historical Recovery Rate (0–1)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={form.historical_recovery_rate}
                      onChange={(e) => set("historical_recovery_rate", parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loadingEvaluate}>
            <Play size={15} />
            {loadingEvaluate ? "Analyzing..." : "Analyze Recovery"}
          </button>
        </form>
      )}

      {/* ══════════════ STEP 2: ANALYSIS ══════════════ */}
      {step >= 2 && evaluation && (
        <div className="card" style={{ display: step === 2 ? "block" : step > 2 ? "block" : "none" }}>
          <p className="card-title" style={{ marginBottom: 16 }}>Step 2 — Recovery Analysis</p>

          {/* 4 result cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {/* Recovery chance */}
            <div style={{ background: probPct >= 60 ? "#f0fdf4" : probPct >= 40 ? "#fffbeb" : "#fff1f2", border: `1px solid ${probPct >= 60 ? "#bbf7d0" : probPct >= 40 ? "#fde68a" : "#fecdd3"}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", margin: "0 0 8px" }}>Recovery Chance</p>
              <p style={{ fontSize: 30, fontWeight: 800, color: probPct >= 60 ? "#15803d" : probPct >= 40 ? "#b45309" : "#be123c", margin: 0, letterSpacing: "-0.03em" }}>
                {probPct}%
              </p>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0" }}>
                {probPct >= 60 ? "Good" : probPct >= 40 ? "Moderate" : "Low"}
              </p>
            </div>

            {/* Recommended action */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", margin: "0 0 8px" }}>Recommended Action</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", margin: 0, lineHeight: 1.3 }}>
                {actionLabel(evaluation.decision.recommendedAction)}
              </p>
            </div>

            {/* Expected value */}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", margin: "0 0 8px" }}>
                Expected Recovery Value (ERV)
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#15803d", margin: 0 }}>
                ${evaluation.decision.expectedRecoveryValue?.toFixed(2)}
              </p>
            </div>

            {/* Model */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", margin: "0 0 8px" }}>Model</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <Cpu size={13} color="#2563eb" />
                <p style={{ fontSize: 11, fontWeight: 700, color: "#334155", margin: 0 }}>
                  {evaluation.prediction.model_name}
                </p>
              </div>
              <p style={{ fontSize: 10, color: "#94a3b8", margin: "4px 0 0" }}>
                v{evaluation.prediction.model_version}
              </p>
            </div>
          </div>

          {/* Why this decision */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Why this decision?
            </p>
            <p style={{ fontSize: 13, color: "#1e293b", margin: 0, lineHeight: 1.6 }}>
              {actionExplanation(evaluation.decision.recommendedAction, evaluation.decision.decisionReason)}
            </p>
          </div>

          {/* Technical details toggle */}
          <button type="button" className="expand-trigger" onClick={() => setAdvancedOpen(!advancedOpen)}>
            {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {advancedOpen ? "Hide" : "View"} Technical Details
          </button>
          {advancedOpen && (
            <div style={{ marginTop: 12, padding: "12px 14px", background: "#0f172a", borderRadius: 8, fontFamily: "monospace", fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
              <div>Probability: <span style={{ color: "#34d399" }}>{evaluation.prediction.recovery_probability}</span></div>
              <div>Action: <span style={{ color: "#60a5fa" }}>{evaluation.decision.recommendedAction}</span></div>
              <div>ERV: <span style={{ color: "#a78bfa" }}>${evaluation.decision.expectedRecoveryValue?.toFixed(4)}</span></div>
              <div>Suggested Delay: <span style={{ color: "#fbbf24" }}>{evaluation.decision.suggestedDelay ? `${evaluation.decision.suggestedDelay} min` : "None"}</span></div>
              <div>Rationale: <span style={{ color: "#e2e8f0" }}>{evaluation.decision.decisionReason}</span></div>
            </div>
          )}

          {step === 2 && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 20, width: "100%" }}
              onClick={() => setStep(3)}
            >
              Continue to Safety Check →
            </button>
          )}
        </div>
      )}

      {/* ══════════════ STEP 3: SAFETY CHECK ══════════════ */}
      {step >= 3 && evaluation && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: 16 }}>Step 3 — Safety Check</p>

          {/* Big result */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 20px",
              borderRadius: 10,
              marginBottom: 14,
              background: safetyPassed ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${safetyPassed ? "#bbf7d0" : "#fecdd3"}`,
            }}
          >
            {safetyPassed ? (
              <ShieldCheck size={28} color="#059669" />
            ) : (
              <ShieldAlert size={28} color="#e11d48" />
            )}
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: safetyPassed ? "#15803d" : "#be123c" }}>
                {safetyPassed ? "✓ Safe to Proceed" : "⚠ Recovery Blocked"}
              </p>
              <p style={{ fontSize: 13, color: safetyPassed ? "#166534" : "#881337", margin: "4px 0 0", lineHeight: 1.4 }}>
                {safetyExplanation(safetyPassed, evaluation.safety.failureReason)}
              </p>
            </div>
          </div>

          {/* Safety checks expandable */}
          <button type="button" className="expand-trigger" onClick={() => setSafetyOpen(!safetyOpen)}>
            {safetyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {safetyOpen ? "Hide" : "View"} Individual Safety Checks
          </button>

          {safetyOpen && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {Object.entries(evaluation.safety.checks).map(([key, passed]: [string, any]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 7,
                    border: `1px solid ${passed ? "#bbf7d0" : "#fecdd3"}`,
                    background: passed ? "#f0fdf4" : "#fff1f2",
                    fontSize: 12,
                    color: passed ? "#15803d" : "#be123c",
                    fontWeight: 600,
                  }}
                >
                  <span>{checkLabel(key)}</span>
                  {passed ? <CheckCircle2 size={14} color="#059669" /> : <XCircle size={14} color="#e11d48" />}
                </div>
              ))}
            </div>
          )}

          {step === 3 && safetyPassed && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 20, width: "100%" }}
              onClick={() => setStep(4)}
            >
              Continue to Simulation →
            </button>
          )}

          {step === 3 && !safetyPassed && (
            <div className="alert-box alert-error" style={{ marginTop: 16 }}>
              <XCircle size={14} style={{ flexShrink: 0 }} />
              <span>Recovery is blocked by the safety policy. No simulation will be run.</span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ STEP 4: SIMULATION ══════════════ */}
      {step === 4 && evaluation && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: 16 }}>Step 4 — Run Simulation</p>

          {!execution ? (
            <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Play size={22} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
                Ready to Simulate Recovery
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                This will simulate the recommended recovery action. <strong>No real payment will be processed.</strong> This is a purely simulated environment.
              </p>
              <button
                className="btn btn-success btn-lg"
                onClick={handleExecute}
                disabled={loadingExecute}
                style={{ minWidth: 220 }}
              >
                <Play size={16} />
                {loadingExecute ? "Simulating..." : "Run Recovery Simulation"}
              </button>
            </div>
          ) : (
            <div>
              {/* Big outcome */}
              {execution.outcome === "RECOVERED" ? (
                <div className="alert-box alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>✓ Payment Recovered</p>
                    <p style={{ fontSize: 13, margin: 0 }}>
                      Simulated recovery completed successfully.{" "}
                      <strong>${execution.recoveryValue?.toFixed(2)}</strong> recovered.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="alert-box alert-error" style={{ marginBottom: 16 }}>
                  <XCircle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>✕ Recovery Attempt Failed</p>
                    <p style={{ fontSize: 13, margin: 0 }}>
                      The simulated payment was not recovered. No real payment was affected.
                    </p>
                  </div>
                </div>
              )}

              {execution.notes && (
                <p style={{ fontSize: 13, color: "#475569", margin: "0 0 20px", background: "#f8fafc", padding: "10px 14px", borderRadius: 7, border: "1px solid #e2e8f0" }}>
                  {execution.notes}
                </p>
              )}

              <button className="btn btn-ghost" onClick={handleReset}>
                <RotateCcw size={13} />
                Start New Simulation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
