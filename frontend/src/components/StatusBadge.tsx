import React from "react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status?.toUpperCase() || "UNKNOWN";

  let styles = "bg-slate-100 text-slate-700 border-slate-200";

  switch (normalized) {
    case "RECOVERED":
    case "SUCCESS":
    case "PASSED":
    case "HEALTHY":
      styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "FAILED":
    case "FAILURE":
    case "BLOCKED":
    case "DOWN":
    case "FAILED_PERMANENTLY":
      styles = "bg-rose-50 text-rose-700 border-rose-200";
      break;
    case "RETRY_NOW":
      styles = "bg-blue-50 text-blue-700 border-blue-200";
      break;
    case "RETRY_LATER":
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "ALTERNATE_ROUTE":
      styles = "bg-purple-50 text-purple-700 border-purple-200";
      break;
    case "CUSTOMER_ACTION_REQUIRED":
      styles = "bg-orange-50 text-orange-700 border-orange-200";
      break;
    case "STOP":
      styles = "bg-slate-100 text-slate-800 border-slate-300";
      break;
    case "PENDING":
    case "FLAG_FOR_REVIEW":
    case "DEGRADED":
      styles = "bg-amber-50 text-amber-700 border-amber-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styles} whitespace-nowrap`}
    >
      {normalized}
    </span>
  );
};

export const ProbabilityBadge: React.FC<{ probability: number }> = ({ probability }) => {
  const pct = Math.round(probability * 100);
  let color = "text-rose-600 bg-rose-50 border-rose-200";
  if (probability >= 0.7) {
    color = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (probability >= 0.4) {
    color = "text-amber-700 bg-amber-50 border-amber-200";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border ${color}`}>
      <span>{pct}%</span>
      <span className="text-[10px] text-slate-400">({probability.toFixed(2)})</span>
    </span>
  );
};
