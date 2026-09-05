import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Monitor,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { StatusBadge } from "../components/StatusBadge";
import {
  fetchOverview,
  fetchActions,
  fetchTransactions,
} from "../api";

// ─── Helper: human-readable action labels ───────────────────────────────────
function labelAction(action: string): string {
  const map: Record<string, string> = {
    RETRY_NOW: "Retry Now",
    RETRY_LATER: "Retry Later",
    ALTERNATE_ROUTE: "Alternate Route",
    CUSTOMER_ACTION_REQUIRED: "Customer Action",
    STOP: "Stop",
    FLAG_FOR_REVIEW: "Flag for Review",
  };
  return map[action] || action;
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor?: string;
  sub?: string;
}> = ({ label, value, icon: Icon, iconColor = "#2563eb", sub }) => (
  <div className="metric-card">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <p className="metric-label">{label}</p>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${iconColor}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={15} color={iconColor} />
      </div>
    </div>
    <p className="metric-value">{value}</p>
    {sub && <p className="metric-sub">{sub}</p>}
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, actRes, txRes] = await Promise.all([
        fetchOverview().catch(() => ({ success: false })),
        fetchActions().catch(() => ({ success: false })),
        fetchTransactions({ limit: 8 }).catch(() => ({ success: false })),
      ]);
      if (ovRes?.success) setOverview(ovRes.data);
      if (actRes?.success) setActions((actRes.data || []).map((a: any) => ({ ...a, action: labelAction(a.action) })));
      if (txRes?.success) setRecentTxs(txRes.data || []);
    } catch (err: any) {
      setError("Could not load dashboard data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ov = overview;
  const recoveryRate = ov ? (ov.recoveryRate * 100).toFixed(1) + "%" : "—";
  const recoveredValue = ov
    ? "$" + (ov.recoveredValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })
    : "—";
  const hasData = ov && ov.totalTransactions > 0;

  // Chart colors
  const BAR_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0891b2"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Monitor simulated payment failures and recovery decisions.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="metric-grid">
        <KpiCard
          label="Total Failed Payments"
          value={loading ? "—" : (ov?.totalTransactions ?? 0)}
          icon={AlertCircle}
          iconColor="#e11d48"
          sub="simulated failures"
        />
        <KpiCard
          label="Recovered Payments"
          value={loading ? "—" : (ov?.recoveredTransactions ?? 0)}
          icon={CheckCircle2}
          iconColor="#059669"
          sub={hasData ? `of ${ov.totalTransactions} processed` : undefined}
        />
        <KpiCard
          label="Recovery Rate"
          value={loading ? "—" : recoveryRate}
          icon={TrendingUp}
          iconColor="#2563eb"
          sub="ML + safety engine"
        />
        <KpiCard
          label="Estimated Value Recovered"
          value={loading ? "—" : recoveredValue}
          icon={DollarSign}
          iconColor="#059669"
          sub="simulated USD"
        />
      </div>

      {/* Body: table + chart side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        {/* Recent Recovery Decisions */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="card-title" style={{ marginBottom: 0 }}>Recent Recovery Decisions</p>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>Latest transactions evaluated by the recovery engine</p>
            </div>
            <Link to="/transactions" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 20px", color: "#94a3b8", fontSize: 13 }}>
              <RefreshCw size={16} className="animate-spin" /> Loading...
            </div>
          ) : recentTxs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Failure Reason</th>
                    <th>Recommended Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.map((tx) => (
                    <tr key={tx.id || tx.transactionId}>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "#334155", fontWeight: 600 }}>
                        <Link to={`/transactions/${tx.transactionId}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                          {tx.transactionId}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>${tx.amount.toFixed(2)}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                        {tx.failureReason?.replace(/_/g, " ")}
                      </td>
                      <td>
                        {tx.recommendedAction ? (
                          <StatusBadge status={tx.recommendedAction} />
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>No transactions yet</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>
                Run the Simulator to generate your first simulated payment failure.
              </p>
              <Link to="/simulator" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                Open Simulator
              </Link>
            </div>
          )}
        </div>

        {/* Right column: chart + system status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recovery Performance chart */}
          <div className="card">
            <p className="card-title">Recovery Performance</p>
            {hasData && actions.length > 0 ? (
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actions} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="action" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {actions.map((_: any, i: number) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <BarChart3Icon />
                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: 0 }}>
                  Run simulations to see recovery performance charts
                </p>
                <Link to="/experiments" style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  Run Experiment →
                </Link>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="card">
            <p className="card-title">System Status</p>
            <div>
              <div className="status-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e293b" }}>
                  <Cpu size={14} color="#2563eb" />
                  ML Model Connected
                </div>
                <span className="badge badge-green">Active</span>
              </div>
              <div className="status-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e293b" }}>
                  <ShieldCheck size={14} color="#059669" />
                  Safety Policy
                </div>
                <span className="badge badge-green">Enforced</span>
              </div>
              <div className="status-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#1e293b" }}>
                  <Monitor size={14} color="#d97706" />
                  Environment
                </div>
                <span className="badge badge-amber">Simulation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder bar chart icon for empty state
const BarChart3Icon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
    <path d="M3 3v18h18" />
    <path d="M18 9V21" />
    <path d="M13 5V21" />
    <path d="M8 13V21" />
  </svg>
);
