import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TopNav } from "./components/TopNav";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { TransactionDetailPage } from "./pages/TransactionDetailPage";
import { SimulatorPage } from "./pages/SimulatorPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ExperimentsPage } from "./pages/ExperimentsPage";
import { AuditTrailPage } from "./pages/AuditTrailPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f1f5f9" }}>
        <TopNav />
        <main style={{ flex: 1 }}>
          <div className="page-main">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/transactions/:id" element={<TransactionDetailPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/experiments" element={<ExperimentsPage />} />
              <Route path="/audit" element={<AuditTrailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
