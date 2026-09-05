import React, { useEffect, useState } from "react";
import { RefreshCw, Search, Filter, AlertCircle, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { fetchAuditLogs } from "../api";

const EVENT_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PREDICTION_GENERATED: { label: "ML Prediction", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  RECOVERY_DECISION_CREATED: { label: "Recovery Decision", color: "#6d28d9", bg: "#faf5ff", border: "#ddd6fe" },
  SAFETY_CHECK_COMPLETED: { label: "Safety Check", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  RECOVERY_EXECUTED: { label: "Recovery Executed", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  SIMULATED_RECOVERY_EXECUTED: { label: "Simulated Execution", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
};

function formatEventData(eventType: string, eventData: any): string {
  if (!eventData) return "";
  if (eventType === "PREDICTION_GENERATED" && eventData.recovery_probability != null) {
    return `Recovery probability: ${Math.round(eventData.recovery_probability * 100)}%`;
  }
  if (eventType === "RECOVERY_DECISION_CREATED" && eventData.recommendedAction) {
    return `Recommended: ${eventData.recommendedAction.replace(/_/g, " ")}`;
  }
  if (eventType === "SAFETY_CHECK_COMPLETED" && eventData.finalSafetyResult) {
    return `Safety result: ${eventData.finalSafetyResult}`;
  }
  if (eventType === "RECOVERY_EXECUTED" && eventData.outcome) {
    return `Outcome: ${eventData.outcome}`;
  }
  if (eventType === "SIMULATED_RECOVERY_EXECUTED" && eventData.outcome) {
    return `Simulated outcome: ${eventData.outcome}`;
  }
  return "";
}

export const AuditTrailPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [searchTxId, setSearchTxId] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (searchTxId) params.transactionId = searchTxId;
      const res = await fetchAuditLogs(params);
      setLogs(res.success ? (res.data || []) : []);
    } catch (err: any) {
      setError("Failed to load decision history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventTypeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Decision History</h1>
          <p className="page-subtitle">See how each recovery decision was made — from ML prediction to final outcome.</p>
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

      {/* Filters */}
      <div className="card card-sm" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Transaction ID..."
            value={searchTxId}
            onChange={(e) => setSearchTxId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="form-input search-input"
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} color="#94a3b8" />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="form-select"
            style={{ width: "auto" }}
          >
            <option value="">All Event Types</option>
            <option value="PREDICTION_GENERATED">ML Prediction</option>
            <option value="RECOVERY_DECISION_CREATED">Recovery Decision</option>
            <option value="SAFETY_CHECK_COMPLETED">Safety Check</option>
            <option value="RECOVERY_EXECUTED">Recovery Executed</option>
            <option value="SIMULATED_RECOVERY_EXECUTED">Simulated Execution</option>
          </select>
        </div>
        {searchTxId && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearchTxId(""); load(); }}>
            Clear
          </button>
        )}
      </div>

      {/* Log list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "48px 0", color: "#94a3b8", fontSize: 13 }}>
          <RefreshCw size={16} className="animate-spin" /> Loading decision history...
        </div>
      ) : logs.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              <strong style={{ color: "#0f172a" }}>{logs.length}</strong> event{logs.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <div>
            {logs.map((log, idx) => {
              const isExpanded = expandedId === log.id;
              const meta = EVENT_LABELS[log.eventType] || { label: log.eventType, color: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
              const summary = formatEventData(log.eventType, log.eventData);

              return (
                <div
                  key={log.id}
                  style={{ borderBottom: idx < logs.length - 1 ? "1px solid #f1f5f9" : "none" }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {/* Expand toggle */}
                    <span style={{ color: "#94a3b8", flexShrink: 0 }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>

                    {/* Time */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 100 }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Transaction ID */}
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#334155", flexShrink: 0, minWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.transactionId || "—"}
                    </span>

                    {/* Event type badge */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 5,
                      border: `1px solid ${meta.border}`,
                      background: meta.bg,
                      color: meta.color,
                      flexShrink: 0,
                    }}>
                      {meta.label}
                    </span>

                    {/* Summary */}
                    {summary && (
                      <span style={{ fontSize: 12, color: "#475569", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {summary}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: "0 20px 14px 48px" }}>
                      <div style={{
                        background: "#0f172a",
                        borderRadius: 8,
                        padding: "12px 16px",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#94a3b8",
                        lineHeight: 1.7,
                        overflowX: "auto",
                      }}>
                        <div style={{ color: "#64748b", marginBottom: 4 }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <pre style={{ margin: 0, color: "#e2e8f0" }}>
                          {JSON.stringify(log.eventData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "56px 20px" }}>
          <Clock size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>
            No decision events recorded yet
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Decision events are automatically logged whenever the ML pipeline or simulator runs a transaction.
          </p>
          <a href="/simulator" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
            Open Simulator
          </a>
        </div>
      )}
    </div>
  );
};
