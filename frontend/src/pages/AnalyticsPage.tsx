import React, { useEffect, useState } from "react";
import { TrendingUp, CheckCircle2, DollarSign, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { fetchOverview, fetchOutcomes, fetchActions, fetchFailures } from "../api";

const COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48", "#0891b2", "#be123c"];

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, out, act, fail] = await Promise.all([
        fetchOverview().catch(() => ({ success: false })),
        fetchOutcomes().catch(() => ({ success: false })),
        fetchActions().catch(() => ({ success: false })),
        fetchFailures().catch(() => ({ success: false })),
      ]);
      if (ov?.success) setOverview(ov.data);
      if (out?.success) setOutcomes(out.data || []);
      if (act?.success) setActions(act.data || []);
      if (fail?.success) setFailures(fail.data || []);
    } catch (err: any) {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasData = overview && overview.totalTransactions > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Recovery Analytics</h1>
          <p className="page-subtitle">Statistical overview of recovery performance across all simulated transactions.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Top metrics: 3 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="metric-label">Recovery Rate</p>
            <TrendingUp size={16} color="#2563eb" />
          </div>
          <p className="metric-value">
            {loading ? "—" : overview ? `${(overview.recoveryRate * 100).toFixed(1)}%` : "0.0%"}
          </p>
          <p className="metric-sub">of all simulated failures</p>
        </div>

        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="metric-label">Estimated Value Recovered</p>
            <DollarSign size={16} color="#059669" />
          </div>
          <p className="metric-value">
            {loading ? "—" : `$${(overview?.recoveredValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </p>
          <p className="metric-sub">simulated USD</p>
        </div>

        <div className="metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="metric-label">Average Retry Attempts</p>
            <RotateCcw size={16} color="#d97706" />
          </div>
          <p className="metric-value">
            {loading ? "—" : overview?.averageAttempts?.toFixed(2) ?? "0.00"}
          </p>
          <p className="metric-sub">per transaction</p>
        </div>
      </div>

      {/* Charts — only shown when data exists */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "48px 0", color: "#94a3b8", fontSize: 13 }}>
          <RefreshCw size={16} className="animate-spin" /> Loading analytics...
        </div>
      ) : hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Row 1: Outcomes + Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Recovery Results */}
            <div className="card">
              <p className="card-title">Recovery Results</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "-6px 0 14px" }}>
                Breakdown of simulated recovery outcomes
              </p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outcomes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="result" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {outcomes.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? "#059669" : i === 1 ? "#e11d48" : COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recovery rate by failure reason */}
            <div className="card">
              <p className="card-title">Recovery Rate by Failure Reason</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "-6px 0 14px" }}>
                Decision actions assigned by the engine
              </p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actions} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="action" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {actions.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Failure distribution */}
          <div className="card">
            <p className="card-title">Failure Reason Distribution</p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "-6px 0 14px" }}>
              Types of payment failures encountered in simulations
            </p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failures} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="reason" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {failures.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "56px 20px" }}>
          <CheckCircle2 size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>No analytics data yet</p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Analytics will automatically update as you run simulations. Try running the Simulator or a batch experiment.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <a href="/simulator" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              Open Simulator
            </a>
            <a href="/experiments" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
              Run Experiment
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
