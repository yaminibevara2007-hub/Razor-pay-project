import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const ML_BASE_URL = import.meta.env.VITE_ML_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const mlApi = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper API functions
export const fetchHealth = async () => (await api.get("/api/health")).data;
export const fetchOverview = async () => (await api.get("/api/analytics/overview")).data;
export const fetchOutcomes = async () => (await api.get("/api/analytics/outcomes")).data;
export const fetchActions = async () => (await api.get("/api/analytics/actions")).data;
export const fetchGateways = async () => (await api.get("/api/analytics/gateways")).data;
export const fetchFailures = async () => (await api.get("/api/analytics/failures")).data;
export const fetchRecoveryValue = async () => (await api.get("/api/analytics/recovery-value")).data;
export const fetchStrategies = async () => (await api.get("/api/analytics/strategies")).data;

export const fetchTransactions = async (params: Record<string, any> = {}) =>
  (await api.get("/api/transactions", { params })).data;

export const fetchTransactionById = async (id: string) =>
  (await api.get(`/api/transactions/${id}`)).data;

export const fetchRecoveryDecisions = async () =>
  (await api.get("/api/recovery-decisions")).data;

export const fetchAuditLogs = async (params: Record<string, any> = {}) =>
  (await api.get("/api/audit", { params })).data;

export const generateSyntheticTx = async (overrides: Record<string, any> = {}) =>
  (await api.post("/api/simulator/transaction", overrides)).data;

export const evaluateRecovery = async (payload: Record<string, any>) =>
  (await api.post("/api/simulator/evaluate", payload)).data;

export const executeRecovery = async (payload: { transaction: any; decision: any; prediction: any }) =>
  (await api.post("/api/simulator/execute", payload)).data;

export const runExperiment = async (payload: { experimentName: string; datasetSize: number }) =>
  (await api.post("/api/experiments/run", payload)).data;

export const fetchModelInfo = async () => {
  try {
    const res = await mlApi.get("/model/info");
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.response?.data?.detail || err.message };
  }
};
