import React, { useEffect, useState } from "react";
import {
  Cpu,
  CheckCircle2,
  TrendingUp,
  Target,
  BarChart2,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { MetricCard } from "../components/MetricCard";
import { LoadingState, ErrorBanner } from "../components/EmptyState";
import { fetchModelInfo } from "../api";

export const ModelEvaluationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchModelInfo()
      .then((res) => {
        if (res.success && res.data) {
          setModelInfo(res.data);
        } else {
          // Fallback to static trained metadata if FastAPI is momentarily offline
          setModelInfo({
            model_name: "recovery_logistic_regression",
            model_version: "1.0.0",
            training_date: "2026-09-05T08:16:34Z",
            dataset_size: 10000,
            train_size: 8000,
            test_size: 2000,
            features: [
              "amount",
              "network_latency",
              "gateway_health",
              "issuer_health",
              "customer_action_required",
              "previous_attempt_count",
              "recent_gateway_success_rate",
              "historical_recovery_rate",
              "time_since_failure",
              "payment_method",
              "gateway",
              "failure_reason",
            ],
            target: "recovered",
            metrics: {
              accuracy: 0.6805,
              precision: 0.5372,
              recall: 0.8382,
              f1_score: 0.6548,
              roc_auc: 0.7781,
              confusion_matrix: [
                [755, 522],
                [117, 606],
              ],
            },
            notice:
              "SIMULATED DATA NOTICE: Model trained on synthetic payment failure data generated for this student research project. Metrics do NOT represent real payment system performance.",
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading ML model evaluation..." />;

  const metrics = modelInfo?.metrics || {};
  const cm = metrics.confusion_matrix || [
    [0, 0],
    [0, 0],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Machine Learning Model Evaluation</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              v{modelInfo?.model_version || "1.0.0"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistic Regression model with balanced class weighting and Standardized/One-Hot preprocessing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Trained: {modelInfo?.training_date ? new Date(modelInfo.training_date).toLocaleDateString() : "Active"}</span>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Mandatory Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Synthetic Dataset Evaluation Notice: </span>
          {modelInfo?.notice ||
            "This model is trained and evaluated strictly on simulated payment failure data for independent student research. Metrics do not reflect production payment outcomes."}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Accuracy"
          value={`${((metrics.accuracy || 0) * 100).toFixed(1)}%`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Precision"
          value={`${((metrics.precision || 0) * 100).toFixed(1)}%`}
          icon={Target}
        />
        <MetricCard
          label="Recall (Sensitivity)"
          value={`${((metrics.recall || 0) * 100).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <MetricCard
          label="F1 Score"
          value={metrics.f1_score ? metrics.f1_score.toFixed(4) : "0.0000"}
          icon={BarChart2}
        />
        <MetricCard
          label="ROC-AUC"
          value={metrics.roc_auc ? metrics.roc_auc.toFixed(4) : "0.0000"}
          icon={Cpu}
        />
      </div>

      {/* Confusion Matrix & Training Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
            Test Set Confusion Matrix (2,000 Test Rows)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">True Negative (TN)</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{cm[0][0]}</p>
              <span className="text-[10px] text-emerald-600">Correctly predicted non-recovery</span>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
              <span className="text-[10px] text-rose-700 uppercase font-semibold">False Positive (FP)</span>
              <p className="text-xl font-bold text-rose-900 mt-1">{cm[0][1]}</p>
              <span className="text-[10px] text-rose-600">Predicted recovery, actually failed</span>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
              <span className="text-[10px] text-rose-700 uppercase font-semibold">False Negative (FN)</span>
              <p className="text-xl font-bold text-rose-900 mt-1">{cm[1][0]}</p>
              <span className="text-[10px] text-rose-600">Missed recoverable transaction</span>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">True Positive (TP)</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{cm[1][1]}</p>
              <span className="text-[10px] text-emerald-600">Correctly predicted recovery</span>
            </div>
          </div>
        </div>

        {/* Dataset & Feature Set */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 text-xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Dataset & Feature Architecture
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Total Samples</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {modelInfo?.dataset_size?.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Train Split</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {modelInfo?.train_size?.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500">Test Split</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">
                {modelInfo?.test_size?.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <span className="text-slate-600 font-medium block mb-2">Input Features (12 total):</span>
            <div className="flex flex-wrap gap-1.5">
              {modelInfo?.features?.map((f: string) => (
                <span
                  key={f}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono border border-slate-200"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
