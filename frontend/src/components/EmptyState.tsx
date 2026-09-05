import React from "react";
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, actionText, onAction }) => {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-xl border border-slate-200">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-4 flex items-start justify-between text-xs my-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:text-rose-900"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = "Loading data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
      <p className="text-xs text-slate-500 font-medium">{message}</p>
    </div>
  );
};
