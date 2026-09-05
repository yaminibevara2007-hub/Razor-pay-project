import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { StatusBadge, ProbabilityBadge } from "../components/StatusBadge";
import { EmptyState, LoadingState, ErrorBanner } from "../components/EmptyState";
import { fetchRecoveryDecisions } from "../api";

export const RecoveryDecisionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRecoveryDecisions();
      if (res.success) {
        setDecisions(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load recovery decisions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Recovery Decisions Feed</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit stream of recommended actions produced by the cost-aware decision engine.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {loading ? (
        <LoadingState message="Loading recovery decisions..." />
      ) : decisions.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Recovery Prob</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4">Expected Value (ERV)</th>
                  <th className="py-3 px-4">Delay</th>
                  <th className="py-3 px-4">Rationale</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decisions.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {d.transactionId}
                    </td>
                    <td className="py-3 px-4">
                      <ProbabilityBadge probability={d.recoveryProbability} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.recommendedAction} />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${d.expectedRecoveryValue?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {d.suggestedDelay ? `${d.suggestedDelay}m` : "None"}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate">
                      {d.decisionReason}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/transactions/${d.transactionId}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No Recovery Decisions Recorded"
          description="Decisions are recorded when transactions are evaluated in the Simulator or via API."
          actionText="Open Simulator"
          onAction={() => (window.location.href = "/simulator")}
        />
      )}
    </div>
  );
};
