# AI Revenue Recovery Engine

> **Subtitle:** Adaptive, Cost-Aware Payment Failure Recovery  
> **Environment:** Simulated Payment Sandbox for Academic & Research Purposes  
> **Author:** Student Developer Project  

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)]()
[![Python](https://img.shields.io/badge/Python-3.13-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal)]()
[![React](https://img.shields.io/badge/React-19.x-61dafb)]()

---

## ⚠️ Important Disclaimer
**This project operates entirely in a SIMULATED payment environment using synthetic data.**  
It does **NOT** process real financial transactions, integrate with live payment gateway production accounts, or access private merchant/internal payment-provider data. All recovery results, latency estimates, and gateway health numbers are simulated for educational and algorithmic research purposes.

---

## 1. Project Overview & Problem Statement
Between 5% to 15% of all digital commerce payments fail. Traditional recovery systems rely on naive, rigid rules (such as blindly retrying all failures 3 times after 15 minutes), which causes:
* **Excessive Network Fees & Gateway Penalties:** Retrying permanent failures (expired cards, fraud blocks).
* **Cascading Gateway Overload:** Retrying into a degraded or down gateway creates a thundering-herd storm.
* **Customer Friction:** Repeated silent card hits trigger security blocks and churn.
* **Negative Expected ROI:** Retrying micro-transactions where attempt costs exceed transaction value destroys merchant margins.

**The Solution:** An adaptive, cost-aware revenue recovery engine combining:
1. **Machine Learning Inference:** Scikit-Learn Logistic Regression model predicting recovery probability $P(\text{recovery}) \in [0.01, 0.99]$.
2. **Cost-Aware Recovery Decision Engine:** Evaluates **Expected Recovery Value (ERV)** = `(probability × amount) − recovery_cost − risk_cost` and selects optimal actions (`RETRY_NOW`, `RETRY_LATER`, `ALTERNATE_ROUTE`, `CUSTOMER_ACTION_REQUIRED`, `STOP`).
3. **Authoritative Safety Policy:** Enforces hard business invariants (max 3 retries, 5-minute cooldown, idempotency, permanent error blocking) that cannot be overridden by ML.
4. **Simulated Execution & Benchmark Engine:** Compares adaptive recovery against static baselines across 5 strategies.

---

## 2. System Architecture

```
                                  +----------------------------+
                                  |  React + Vite Frontend     |
                                  |  Port 5173                 |
                                  +--------------+-------------+
                                                 | REST APIs
                                                 v
+-----------------------+         +----------------------------+
| Python FastAPI        | <=====> | Node.js Express Backend    |
| Port 8000             |         | Port 5000                  |
| - Logistic Regression |         | - Decision Engine (ERV)    |
| - Feature Normalizer  |         | - Safety Policy (Auth)     |
+-----------------------+         | - Experiment Engine        |
                                  +--------------+-------------+
                                                 | Prisma ORM
                                                 v
                                  +----------------------------+
                                  | PostgreSQL / Resilient DB  |
                                  | Persistence & Audit Trail  |
                                  +----------------------------+
```

### End-to-End Decision Pipeline:
```
FAILED TRANSACTION
        ↓
ML PREDICTION (Recovery Probability)
        ↓
RECOVERY DECISION ENGINE (Action + Expected Recovery Value)
        ↓
SAFETY POLICY (Idempotency, Retries ≤ 3, Cooldown, Fraud Guard)
        ↓
SIMULATED RECOVERY EXECUTION (Marked simulated=true)
        ↓
AUDIT TRAIL & ANALYTICS PERSISTENCE
```

---

## 3. Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router v7.
* **Backend API & Engine:** Node.js, Express, TypeScript, Zod, Prisma ORM.
* **Machine Learning Microservice:** Python 3.13, FastAPI, Uvicorn, Scikit-Learn, Joblib, NumPy, Pandas.

---

## 4. Quick-Start Guide

### Prerequisites
* **Node.js**: v18+ (v20+ recommended)
* **Python**: v3.11+ (v3.13 tested)
* **npm**

### Step 1: Install Dependencies
```powershell
# In root directory
cd backend && npm install
cd ../frontend && npm install
cd ../ml-service
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

### Step 2: Start Services (3 Terminals)

**Terminal 1 — Machine Learning Service (Port 8000):**
```powershell
cd ml-service
.\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Backend API & Decision Engine (Port 5000):**
```powershell
cd backend
npm run dev
# or: node dist/server.js
```

**Terminal 3 — React Operations Dashboard (Port 5173):**
```powershell
cd frontend
npm run dev
```

Visit the dashboard at **[http://localhost:5173/](http://localhost:5173/)**.

---

## 5. Automated Testing & Scenarios

Run the automated test suite covering all 6 critical failure and recovery scenarios:
```powershell
cd backend
npx ts-node test_e2e_scenarios.ts
```

### Validated Scenarios:
| Scenario | Trigger | Engine Action | Safety Policy | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **1. Expired Card** | `card_expired` | **`STOP`** | **`PASSED`** | Terminal error; retrying wastes fees. |
| **2. Fraud Risk** | `suspected_fraud` | **`STOP`** | **`BLOCKED`** | High risk; immediate safety block. |
| **3. Insufficient Funds** | `insufficient_funds` | **`CUSTOMER_ACTION_REQUIRED`** | **`PASSED`** | Customer must add funds or switch account. |
| **4. Degraded Gateway** | `gateway_health: 0.35` | **`ALTERNATE_ROUTE`** | **`PASSED`** | Shifts transaction from Gateway A to B. |
| **5. Healthy Transient** | `gateway_health: 0.95` | **`RETRY_NOW`** | **`PASSED`** | Positive Expected Recovery Value ($E[V] > 0$). |
| **6. Max Retries** | `previous_attempts: 3` | *Any* | **`BLOCKED`** | Strict card network compliance limit. |

---

## 6. API Route Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and database health status |
| `GET` | `http://localhost:8000/health` | ML service health and model metadata |
| `POST` | `/api/simulator/transaction` | Generates synthetic failed transaction |
| `POST` | `/api/simulator/evaluate` | Evaluates ML score, Decision Action, Safety checks |
| `POST` | `/api/simulator/execute` | Executes simulated recovery attempt |
| `GET` | `/api/transactions` | Filterable list of transactions |
| `GET` | `/api/transactions/:id` | Full 5-stage lifecycle and audit trace |
| `POST` | `/api/experiments/run` | Runs 5-strategy benchmark on $N$ synthetic samples |
| `GET` | `/api/analytics/overview` | Aggregated recovery rates and monetary values |
| `GET` | `/api/audit` | Chronological audit trail logs |

---

## 7. Additional Documentation

* **[Master Architecture & Workflow Guide](docs/FULL_SYSTEM_DOCUMENTATION.md)**
* **[Presentation Slide Deck (12 Slides)](docs/PRESENTATION_DECK.md)**
* **[5-Minute Live Demonstration Script & Q&A Defense](docs/DEMO_SCRIPT.md)**
