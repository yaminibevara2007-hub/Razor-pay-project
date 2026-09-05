import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, ArrowRight, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { fetchTransactions } from "../api";

export const TransactionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [failureFilter, setFailureFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await fetchTransactions(params);
      setTransactions(res.success ? (res.data || []) : []);
    } catch (err: any) {
      setError("Failed to load transactions. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = transactions.filter((t) => {
    const matchSearch = searchQuery
      ? t.transactionId?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchFailure = failureFilter ? t.failureReason === failureFilter : true;
    return matchSearch && matchFailure;
  });

  const uniqueFailures = Array.from(new Set(transactions.map((t) => t.failureReason).filter(Boolean)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">View and inspect simulated failed payments processed by the recovery engine.</p>
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
        {/* Search */}
        <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input search-input"
            style={{ fontFamily: "monospace", fontSize: 12 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} color="#94a3b8" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: "auto" }}>
            <option value="">All Statuses</option>
            <option value="FAILED">Failed</option>
            <option value="RECOVERED">Recovered</option>
            <option value="FAILED_PERMANENTLY">Permanently Failed</option>
          </select>
        </div>

        <select
          value={failureFilter}
          onChange={(e) => setFailureFilter(e.target.value)}
          className="form-select"
          style={{ width: "auto" }}
        >
          <option value="">All Failure Reasons</option>
          {uniqueFailures.map((r) => (
            <option key={r} value={r}>{r?.replace(/_/g, " ")}</option>
          ))}
        </select>

        {(searchQuery || statusFilter || failureFilter) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearchQuery(""); setStatusFilter(""); setFailureFilter(""); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 20px", color: "#94a3b8", fontSize: 13 }}>
            <RefreshCw size={16} className="animate-spin" /> Loading transactions...
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> transaction{filtered.length !== 1 ? "s" : ""}
                {(searchQuery || statusFilter || failureFilter) && " (filtered)"}
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Failure Reason</th>
                  <th>Recommended Action</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: "right" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id || tx.transactionId}>
                    <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#334155" }}>
                      {tx.transactionId}
                    </td>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ textTransform: "capitalize", color: "#475569" }}>
                      {tx.paymentMethod?.replace(/_/g, " ")}
                    </td>
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
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/transactions/${tx.transactionId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                      >
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <Inbox size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>
              No transactions found
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
              {searchQuery || statusFilter || failureFilter
                ? "No transactions match the current filters."
                : "No simulated transactions have been recorded yet. Use the Simulator to process your first payment failure."}
            </p>
            {!(searchQuery || statusFilter || failureFilter) && (
              <Link to="/simulator" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
                Open Simulator
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
