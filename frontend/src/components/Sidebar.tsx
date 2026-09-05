import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  PlayCircle,
  GitPullRequest,
  BarChart3,
  FlaskConical,
  Cpu,
  History,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "Overview", to: "/", icon: LayoutDashboard },
  { name: "Transactions", to: "/transactions", icon: CreditCard },
  { name: "Simulator", to: "/simulator", icon: PlayCircle },
  { name: "Recovery Decisions", to: "/recovery-decisions", icon: GitPullRequest },
  { name: "Analytics", to: "/analytics", icon: BarChart3 },
  { name: "Experiments", to: "/experiments", icon: FlaskConical },
  { name: "Model Evaluation", to: "/model-evaluation", icon: Cpu },
  { name: "Audit Trail", to: "/audit", icon: History },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-white tracking-wide">Revenue Recovery</h1>
          <p className="text-[11px] text-slate-400 font-mono">Adaptive AI Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Simulation Badge & Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Environment</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SIMULATION MODE
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Independent student research project. Simulated payments only.
        </p>
      </div>
    </aside>
  );
};
