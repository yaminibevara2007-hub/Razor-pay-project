import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  PlayCircle,
  BarChart3,
  FlaskConical,
  History,
  Cpu,
  Activity,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { fetchHealth, fetchModelInfo } from "../api";

interface NavTab {
  name: string;
  to: string;
  icon: React.ElementType;
  end?: boolean;
}

const TABS: NavTab[] = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
  { name: "Transactions", to: "/transactions", icon: CreditCard },
  { name: "Simulator", to: "/simulator", icon: PlayCircle },
  { name: "Analytics", to: "/analytics", icon: BarChart3 },
  { name: "Experiments", to: "/experiments", icon: FlaskConical },
  { name: "Audit Logs", to: "/audit", icon: History },
];

export const TopNav: React.FC = () => {
  const [modelOnline, setModelOnline] = useState<boolean | null>(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(true);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const be = await fetchHealth();
        if (isMounted) setBackendOnline(be?.success === true);
      } catch {
        if (isMounted) setBackendOnline(false);
      }

      try {
        const ml = await fetchModelInfo();
        if (isMounted) setModelOnline(ml?.success === true);
      } catch {
        if (isMounted) setModelOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="topnav">
      {/* Brand */}
      <div className="topnav-brand">
        <div className="topnav-logo">
          <ShieldCheck size={17} />
        </div>
        <div>
          <div className="topnav-title">AI Revenue Recovery Engine</div>
          <div className="topnav-subtitle">Adaptive Payment Recovery</div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="topnav-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `topnav-tab${isActive ? " active" : ""}`
            }
          >
            <tab.icon size={14} />
            <span>{tab.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Dynamic Status Badges */}
      <div className="topnav-badges">
        {modelOnline ? (
          <span className="sys-badge sys-badge-blue" title="ML Model service is connected and healthy">
            <Cpu size={10} />
            Model Active
          </span>
        ) : (
          <span className="sys-badge sys-badge-amber" title="ML Model service offline, using deterministic fallback">
            <AlertTriangle size={10} />
            Model Fallback
          </span>
        )}

        {backendOnline ? (
          <span className="sys-badge sys-badge-green" title="Backend and Safety Policy rules are active">
            <Activity size={10} />
            Safety Active
          </span>
        ) : (
          <span className="sys-badge sys-badge-amber" title="Backend service offline">
            <AlertTriangle size={10} />
            Backend Offline
          </span>
        )}

        <span className="sys-badge sys-badge-amber" title="Simulated environment for safety">
          <ShieldAlert size={10} />
          Simulation Mode
        </span>
      </div>
    </header>
  );
};
