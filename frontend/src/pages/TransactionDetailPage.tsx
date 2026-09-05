import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchTransactionById } from "../api";

// ─── Timeline step component ─────────────────────────────────────────────────
const TimelineStep: React.FC<{
  number: number;
  title: string;
  subtitle?: string;
  status?: "done" | "failed" | "pending" | "blocked";
  children?: React.ReactNode;
  isLast?: boolean;
}> = ({ number, title, subtitle, status = "pending", children, isLast }) => {
  const dotColor =
    status === "done" ? "#059669" :
    status === "failed" ? "#e11d48" :
    status === "blocked" ? "#d97706" :
    "#94a3b8";

  const Icon =
    status === "done" ? CheckCircle2 :
    status === "failed" ? XCircle :
    status === "blocked" ? ShieldAlert :
    null;

  return (
    <div style={{ display: "flex", gap: 16, paddingBottom: isLast ? 0 : 24 }}>
      {/* Left: dot + line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 36 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: dotColor + "18",
          border: `2px solid ${dotColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {Icon ? (
            <Icon size={16} color={dotColor} />
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: dotColor }}>{number}</span>
          )}
        </div>
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 16, background: "#e2e8f0", marginTop: 6 }} />
        )}
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, paddingTop: 6, paddingBottom: isLast ? 0 : 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px" }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

// ─── Field row component ──────────────────────────────────────────────────────
const FieldRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
    <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>{value}</span>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<any | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchTransactionById(id)
      .then((res) => {
        if (res.success && res.data) setTx(res.data);
        else setError(res.message || "Transaction not found.");
      })
      .catch((err) => setError(err.message || "Failed to load transaction."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "64px", color: "#94a3b8", fontSize: 13 }}>
        <RefreshCw size={18} className="animate-spin" color="#2563eb" />
        Loading transaction details...
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "48px auto" }}>
        <div className="alert-box alert-error">
          <AlertCircle size={15} />
          <span>{error || "Transaction not found."}</span>
        </div>
        <Link to="/transactions" className="btn btn-ghost btn-sm" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
          <ArrowLeft size={13} /> Back to Transactions
        </Link>
      </div>
    );
  }

  const prediction = tx.modelPredictions?.[0];
  const decision = tx.recoveryDecisions?.[0];
  const safety = tx.safetyChecks?.[0];
  const attempts = tx.recoveryAttempts || [];
  const lastAttempt = attempts[attempts.length - 1];

  const safetyPassed = safety?.finalSafetyResult === "PASSED";
  const probPct = prediction ? Math.round(prediction.recoveryProbability * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800, margin: "0 auto" }}>
      {/* Back nav + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          to="/transactions"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#475569", textDecoration: "none", flexShrink: 0 }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: "monospace", color: "#0f172a" }}>
              {tx.transactionId}
            </h1>
            <StatusBadge status={tx.status} />
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0" }}>
            Recorded {new Date(tx.createdAt).toLocaleString()}
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>
            ${tx.amount.toFixed(2)}
          </p>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
            {tx.paymentMethod?.replace(/_/g, " ")} · {tx.gateway}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: transaction facts */}
        <div className="card">
          <p className="card-title">Payment Details</p>
          <div>
            <FieldRow label="Amount" value={`$${tx.amount.toFixed(2)} ${tx.currency || "USD"}`} />
            <FieldRow label="Payment Method" value={tx.paymentMethod?.replace(/_/g, " ")} />
            <FieldRow label="Payment Gateway" value={tx.gateway} />
            <FieldRow
              label="Failure Reason"
              value={<span style={{ color: "#be123c", fontFamily: "monospace", fontSize: 11 }}>{tx.failureReason}</span>}
            />
            <FieldRow label="Network Latency" value={`${tx.networkLatency} ms`} />
            <FieldRow label="Gateway Health" value={`${(tx.gatewayHealth * 100).toFixed(0)}%`} />
            <FieldRow label="Issuer Health" value={`${(tx.issuerHealth * 100).toFixed(0)}%`} />
            <FieldRow label="Previous Attempts" value={tx.previousAttemptCount ?? 0} />
          </div>
        </div>

        {/* Right: quick summary of decision */}
        <div className="card">
          <p className="card-title">Recovery Summary</p>
          {decision ? (
            <div>
              <FieldRow label="Recommended Action" value={<StatusBadge status={decision.recommendedAction} />} />
              <FieldRow
                label="Expected Recovery Value (ERV)"
                value={decision.expectedRecoveryValue ? `$${decision.expectedRecoveryValue.toFixed(2)}` : "—"}
              />
              <FieldRow
                label="ML Recovery Probability"
                value={probPct != null ? (
                  <span style={{
                    color: probPct >= 60 ? "#15803d" : probPct >= 40 ? "#b45309" : "#be123c",
                    fontWeight: 800,
                  }}>
                    {probPct}%
                  </span>
                ) : "—"}
              />
              <FieldRow
                label="Safety Check"
                value={safety ? (
                  safetyPassed ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#059669", fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle2 size={13} /> Passed
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#e11d48", fontSize: 12, fontWeight: 700 }}>
                      <XCircle size={13} /> Blocked
                    </span>
                  )
                ) : "—"}
              />
              <FieldRow
                label="Final Outcome"
                value={<StatusBadge status={tx.status} />}
              />
              {decision.decisionReason && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#f8fafc", borderRadius: 7, border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 3px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rationale</p>
                  <p style={{ fontSize: 12, color: "#334155", margin: 0, lineHeight: 1.5 }}>{decision.decisionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>No recovery decision recorded for this transaction.</p>
          )}
        </div>
      </div>

      {/* Decision Timeline */}
      <div className="card">
        <p className="card-title" style={{ marginBottom: 20 }}>Recovery Timeline</p>

        <div>
          {/* Step 1: Payment Failed */}
          <TimelineStep
            number={1}
            title="Payment Failed"
            subtitle={`${tx.failureReason?.replace(/_/g, " ")} — $${tx.amount.toFixed(2)} via ${tx.paymentMethod?.replace(/_/g, " ")}`}
            status="failed"
          />

          {/* Step 2: AI Analysis */}
          <TimelineStep
            number={2}
            title="AI Analysis"
            subtitle={prediction ? `ML model estimated ${Math.round(prediction.recoveryProbability * 100)}% recovery probability` : "ML model evaluated payment conditions"}
            status={prediction ? "done" : "pending"}
          >
            {prediction && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge badge-blue">
                  {Math.round(prediction.recoveryProbability * 100)}% probability
                </span>
                <span className="badge badge-slate">
                  {prediction.modelName} v{prediction.modelVersion}
                </span>
              </div>
            )}
          </TimelineStep>

          {/* Step 3: Recovery Decision */}
          <TimelineStep
            number={3}
            title="Recovery Decision"
            subtitle={decision ? `Engine recommended: ${decision.recommendedAction?.replace(/_/g, " ")}` : "Recovery decision engine evaluated options"}
            status={decision ? "done" : "pending"}
          >
            {decision && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge status={decision.recommendedAction} />
                {decision.expectedRecoveryValue && (
                  <span className="badge badge-green">ERV ${decision.expectedRecoveryValue.toFixed(2)}</span>
                )}
              </div>
            )}
          </TimelineStep>

          {/* Step 4: Safety Check */}
          <TimelineStep
            number={4}
            title="Safety Check"
            subtitle={
              safety
                ? safetyPassed
                  ? "All safety checks passed — recovery approved"
                  : `Recovery blocked — ${safety.failureReason || "safety check failed"}`
                : "Safety policy evaluated the decision"
            }
            status={safety ? (safetyPassed ? "done" : "blocked") : "pending"}
          >
            {safety && (
              <div style={{ display: "flex", gap: 6 }}>
                {safetyPassed ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#059669" }}>
                    <ShieldCheck size={14} /> Safe to proceed
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#e11d48" }}>
                    <ShieldAlert size={14} /> Blocked
                  </span>
                )}
              </div>
            )}
          </TimelineStep>

          {/* Step 5: Simulated Execution */}
          <TimelineStep
            number={5}
            title="Simulated Execution"
            subtitle={
              lastAttempt
                ? `Recovery attempt ${lastAttempt.outcome === "RECOVERED" ? "succeeded" : "did not succeed"}`
                : "Recovery was simulated in a sandboxed environment"
            }
            status={lastAttempt ? (lastAttempt.outcome === "RECOVERED" ? "done" : "failed") : "pending"}
            isLast
          >
            {lastAttempt && (
              <div style={{ display: "flex", gap: 8 }}>
                <StatusBadge status={lastAttempt.outcome} />
                {lastAttempt.recoveryValue != null && (
                  <span className="badge badge-green">
                    ${lastAttempt.recoveryValue.toFixed(2)} recovered
                  </span>
                )}
              </div>
            )}
          </TimelineStep>
        </div>
      </div>
    </div>
  );
};
