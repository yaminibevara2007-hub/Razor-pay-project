import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  AlertOctagon,
  CheckCircle2,
  DollarSign,
  Gauge,
  RotateCcw,
  ArrowRight,
  PlayCircle,
  Database,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { MetricCard } from "../components/MetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingState, ErrorBanner } from "../components/EmptyState";
import {
  fetchOverview,
  fetchActions,
  fetchFailures,
  fetchTransactions,
} from "../api";

export const OverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [failures, setFailures] = useState<any[]>([]);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, actRes, failRes, txRes] = await Promise.all([
        fetchOverview().catch(() => ({ success: false })),
        fetchActions().catch(() => ({ success: false })),
        fetchFailures().catch(() => ({ success: false })),
        fetchTransactions({ limit: 6 }).catch(() => ({ success: false })),
      ]);

      if (ovRes?.success) setOverview(ovRes.data);
      if (actRes?.success) setActions(actRes.data || []);
      if (failRes?.success) setFailures(failRes.data || []);
      if (txRes?.success) setRecentTxs(txRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Loading simulated revenue recovery metrics..." />;

  const hasData = overview && overview.totalTransactions > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
              Adaptive Revenue Recovery Simulation
            </h3>
            <p className="text-xs text-blue-700">
              Interactive testbench combining real ML probability inference with cost-aware decision rules and safety policy enforcement.
            </p>
          </div>
        </div>
        <Link
          to="/simulator"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          Open Simulator <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Failed"
          value={overview?.totalTransactions ?? 0}
          icon={AlertOctagon}
          subValue="simulated"
        />
        <MetricCard
          label="Recovered"
          value={overview?.recoveredTransactions ?? 0}
          icon={CheckCircle2}
          trend={hasData ? `${((overview.recoveredTransactions / (overview.totalTransactions || 1)) * 100).toFixed(1)}%` : undefined}
          trendPositive={true}
        />
        <MetricCard
          label="Recovery Rate"
          value={overview ? `${(overview.recoveryRate * 100).toFixed(1)}%` : "0.0%"}
          icon={TrendingUp}
        />
        <MetricCard
          label="Recovered Value"
          value={`$${(overview?.recoveredValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Recovery Prob"
          value={overview ? `${(overview.averageRecoveryProbability * 100).toFixed(1)}%` : "0.0%"}
          icon={Gauge}
        />
        <MetricCard
          label="Avg Attempts"
          value={overview?.averageAttempts?.toFixed(2) ?? "0.00"}
          icon={RotateCcw}
        />
      </div>

      {/* Charts Grid */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recovery Actions Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Recommended Recovery Actions
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actions}>
                  <XAxis dataKey="action" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip wrapperClassName="text-xs rounded shadow" />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Failure Reasons Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Failure Reasons Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failures} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="reason" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip wrapperClassName="text-xs rounded shadow" />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No Persisted Simulated Transactions Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            The database currently has no records. You can run transactions through the Simulator or trigger a batch experiment to populate metrics and charts.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/simulator"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Run Interactive Simulator
            </Link>
            <Link
              to="/experiments"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Run 5-Strategy Experiment
            </Link>
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Transactions
            </h3>
            <p className="text-[11px] text-slate-500">Live feed of evaluated payment failures</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTxs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tx ID</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3">Failure Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTxs.map((tx) => (
                  <tr key={tx.id || tx.transactionId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {tx.transactionId}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 capitalize">{tx.gateway}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {tx.failureReason}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={`/transactions/${tx.transactionId}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-400">
            No simulated transactions recorded yet. Run a simulation above to start.
          </div>
        )}
      </div>
    </div>
  );
};
