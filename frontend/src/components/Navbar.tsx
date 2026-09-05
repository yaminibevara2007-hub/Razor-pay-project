import React from "react";
import { Activity, ShieldAlert, Cpu } from "lucide-react";

interface NavbarProps {
  title: string;
  subtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div>
        <h2 className="text-base font-semibold text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* ML Status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[11px]">Model: LogisticRegression v1.0.0</span>
        </div>

        {/* Safety Policy Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>Safety Active</span>
        </div>

        {/* Disclaimer Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>Simulated Data Only</span>
        </div>
      </div>
    </header>
  );
};
