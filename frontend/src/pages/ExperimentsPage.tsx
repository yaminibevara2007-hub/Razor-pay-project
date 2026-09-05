import React, { useState } from "react";
import { Play, TrendingUp, AlertCircle, RefreshCw, Star } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { runExperiment } from "../api";

const STRATEGY_LABELS: Record<string, string> = {
  NO_RETRY: "No Retry",
  FIXED_RETRY: "Fixed Retry",
  RULE_BASED: "Rule-Based",
  ML_BASED: "ML-Based",
  ADAPTIVE_RECOVERY: "Adaptive Recovery",
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  NO_RETRY: "Never retries a failed payment.",
  FIXED_RETRY: "Always retries a fixed number of times regardless of conditions.",
  RULE_BASED: "Uses hand-crafted business rules to decide when to retry.",
  ML_BASED: "Uses the trained ML model probability to decide on recovery.",
  ADAPTIVE_RECOVERY: "Combines ML predictions with cost-aware decision rules and safety policy enforcement.",
};

export const ExperimentsPage: React.FC = () => {
  const [datasetSize, setDatasetSize] = useState<number>(5000);
  const [experimentName, setExperimentName] = useState<string>(`exp_${Date.now()}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await runExperiment({ experimentName, datasetSize });
      if (res.success && res.results) {
        setResults(res.results);
      } else {
        setError(res.message || "Experiment failed to run.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Experiment run error.");
    } finally {
      setLoading(false);
    }
  };

  const adaptive = results?.find((r) => r.strategy === "ADAPTIVE_RECOVERY");
  const fixedRetry = results?.find((r) => r.strategy === "FIXED_RETRY");
  const uplift =
    fixedRetry && adaptive && fixedRetry.recoveryRate > 0
      ? (((adaptive.recoveryRate - fixedRetry.recoveryRate) / fixedRetry.recoveryRate) * 100).toFixed(1)
      : null;

  const bestStrategy = results
    ? [...results].sort((a, b) => b.recoveryRate - a.recoveryRate)[0]
    : null;

  const chartData = results?.map((r) => ({
    ...r,
    name: STRATEGY_LABELS[r.strategy] || r.strategy,
    "Recovery Rate (%)": parseFloat((r.recoveryRate * 100).toFixed(1)),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Recovery Strategy Comparison</h1>
        <p className="page-subtitle">
          Compare different strategies for handling failed payments using simulated data. Each strategy is tested on the same dataset for a fair comparison.
        </p>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Strategy explainer */}
      {!results && !loading && (
        <div className="card">
          <p className="card-title" style={{ marginBottom: 14 }}>What strategies are compared?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {Object.entries(STRATEGY_LABELS).map(([key, label], i) => (
              <div
                key={key}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: key === "ADAPTIVE_RECOVERY" ? "#eff6ff" : "#f8fafc",
                  borderColor: key === "ADAPTIVE_RECOVERY" ? "#bfdbfe" : "#e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: key === "ADAPTIVE_RECOVERY" ? "#2563eb" : "#e2e8f0",
                      color: key === "ADAPTIVE_RECOVERY" ? "white" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: key === "ADAPTIVE_RECOVERY" ? "#1d4ed8" : "#334155" }}>
                    {label}
                    {key === "ADAPTIVE_RECOVERY" && " ★"}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                  {STRATEGY_DESCRIPTIONS[key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run form */}
      <div className="card">
        <p className="card-title" style={{ marginBottom: 14 }}>Run Experiment</p>
        <form onSubmit={handleRun} style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Experiment Name</label>
            <input
              type="text"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              className="form-input"
              style={{ fontFamily: "monospace", fontSize: 12 }}
              required
            />
          </div>
          <div style={{ width: 200 }}>
            <label className="form-label">Dataset Size</label>
            <select value={datasetSize} onChange={(e) => setDatasetSize(parseInt(e.target.value))} className="form-select">
              <option value={1000}>1,000 transactions</option>
              <option value={5000}>5,000 transactions (default)</option>
              <option value={10000}>10,000 transactions</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
            <Play size={14} />
            {loading ? "Running..." : "Run 5-Strategy Benchmark"}
          </button>
        </form>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "10px 0 0" }}>
          This generates synthetic transactions and runs each of the 5 strategies on the same data. May take a few seconds.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px", color: "#64748b", fontSize: 13 }}>
          <RefreshCw size={18} className="animate-spin" color="#2563eb" />
          Running {datasetSize.toLocaleString()} transactions across 5 strategies...
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Uplift banner */}
          {uplift && parseFloat(uplift) > 0 && (
            <div className="alert-box alert-success" style={{ padding: "14px 20px" }}>
              <TrendingUp size={20} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, margin: "0 0 2px", fontSize: 14 }}>
                  Adaptive Recovery outperforms Fixed Retry by +{uplift}%
                </p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  By combining ML predictions with cost-aware decision rules and safety policy enforcement, the Adaptive strategy recovers more payments efficiently.
                </p>
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <p className="card-title" style={{ marginBottom: 0 }}>Strategy Comparison Results</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Recovery Rate</th>
                    <th>Value Recovered</th>
                    <th>Avg Attempts</th>
                    <th>Total Retry Cost</th>
                    <th>Cost per Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const isBest = bestStrategy?.strategy === r.strategy;
                    const isAdaptive = r.strategy === "ADAPTIVE_RECOVERY";
                    return (
                      <tr key={r.strategy} style={{ background: isAdaptive ? "#eff6ff" : undefined }}>
                        <td style={{ fontWeight: 700, color: isAdaptive ? "#1d4ed8" : "#0f172a" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {STRATEGY_LABELS[r.strategy] || r.strategy}
                            {isBest && (
                              <Star size={12} color="#d97706" fill="#d97706" />
                            )}
                            {isAdaptive && (
                              <span style={{ fontSize: 9, background: "#2563eb", color: "white", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>
                                OUR ENGINE
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: "#0f172a" }}>
                          {(r.recoveryRate * 100).toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 600, color: "#059669" }}>
                          ${r.recoveredValue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td>{r.averageAttempts}</td>
                        <td style={{ fontFamily: "monospace" }}>${r.recoveryCost?.toFixed(2)}</td>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          ${r.costPerRecovery?.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <p className="card-title">Recovery Rate by Strategy</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Recovery Rate"]}
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="Recovery Rate (%)" radius={[4, 4, 0, 0]}>
                    {chartData?.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.strategy === "ADAPTIVE_RECOVERY" ? "#2563eb" : "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setResults(null); setExperimentName(`exp_${Date.now()}`); }}
          >
            Run Another Experiment
          </button>
        </div>
      )}
    </div>
  );
};
