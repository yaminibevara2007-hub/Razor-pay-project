# AI Revenue Recovery Engine — Full System Documentation

> **Subtitle:** Adaptive, Cost-Aware Payment Failure Recovery  
> **Environment:** Simulated Payment Environment for Academic & Research Purposes  
> **Author:** Student Developer Project  

---

## 1. Executive Summary & Problem Space

In modern digital commerce, between **5% to 15% of payment transactions fail**. Payment failures occur across multiple vectors: transient network timeouts, gateway congestion, issuer downtime, insufficient customer funds, fraud filter false-positives, and card credential expiration.

### The Traditional Problem (Blind Retries)
Traditional payment recovery systems operate on naive, hardcoded heuristics—most commonly:
* *Blind Fixed Retry*: Retry every failed transaction 3 times, immediately or at 15-minute fixed intervals.
* *Static Rules*: Attempt one alternate route regardless of the health of the downstream gateway.

**Why this fails in production:**
1. **Financial Penalties:** Card networks (Visa, Mastercard, RuPay) and payment gateways levy retry fees for repeated failures on non-recoverable transactions.
2. **Gateway Degradation:** Blindly retrying into an already congested or down gateway creates a "thundering herd" problem that exacerbates downtime.
3. **Customer Friction & Churn:** Repeated silent card hits trigger security blocks, account lockouts, and negative user sentiment.
4. **Negative Expected ROI:** Retrying micro-transactions where the expected cost of multiple attempts exceeds the transaction value destroys merchant margins.

### The Solution: Adaptive AI Revenue Recovery Engine
This engine implements a 4-tier intelligent recovery architecture:
1. **Decoupled Machine Learning**: A trained Scikit-Learn Logistic Regression model assesses telemetry signals and estimates $P(\text{recovery})$.
2. **Cost-Aware Economic Optimization**: Evaluates Expected Recovery Value ($E[V]$) subtracting retry processing costs and customer risk friction.
3. **Authoritative Safety Enforcement**: A deterministic policy layer with veto authority enforcing hard bounds (maximum 3 retries, minimum 5-minute cooldown, idempotency, permanent error blocking).
4. **Simulated Execution & Continuous Audit**: Executes recovery attempts in a non-financial sandbox and records immutable audit traces.

---

## 2. High-Level Architectural Flow

```
+-----------------------------------------------------------------------------------------------+
|                                    1. TRANSACTION INGESTION                                   |
| - Synthetic failed transaction generated / received                                          |
| - Telemetry: Latency, Gateway Health, Issuer Health, Failure Reason, Historical Rates         |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                    2. ML INFERENCE SERVICE                                    |
| - Python / FastAPI (:8000)                                                                   |
| - Standardized + One-Hot Encoded features                                                     |
| - Logistic Regression pipeline predicts recovery probability: P(recovery) in [0.01, 0.99]     |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                              3. NODE.JS RECOVERY DECISION ENGINE                              |
| - Computes Expected Recovery Value: ERV = (P(recovery) * Amount) - Cost_retry - Cost_risk     |
| - Heuristic rules select action: RETRY_NOW | RETRY_LATER | ALTERNATE_ROUTE |                  |
|   CUSTOMER_ACTION_REQUIRED | STOP                                                             |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                4. AUTHORITATIVE SAFETY POLICY                                 |
| - Evaluates hard compliance constraints:                                                      |
|   * Retry count < 3                                                                           |
|   * Cooldown window >= 300 seconds                                                            |
|   * Idempotency token check                                                                   |
|   * Fraud / Permanent error block                                                             |
| - If any check fails -> BLOCKED (ML is strictly overridden)                                   |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                             5. SIMULATED RECOVERY EXECUTION ENGINE                            |
| - Simulates latency & gateway processing (marked simulated: true)                              |
| - Evaluates dynamic recovery outcome based on action efficacy & real conditions               |
| - State updated: RECOVERED or FAILED                                                          |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                              6. AUDIT TRAIL, EXPERIMENTS & UI                                 |
| - Immutable audit log emitted (JSON payload)                                                  |
| - 5-strategy benchmark: NO_RETRY vs FIXED vs RULE vs ML vs ADAPTIVE                           |
| - React 19 + Vite + TypeScript fintech dashboard (:5173)                                      |
+-----------------------------------------------------------------------------------------------+
```

---

## 3. Working of Each Stage in Detail

### Stage 1: Payment Failure Ingestion & Synthetic Telemetry Generation
When a transaction fails, it is represented as a structured failure record containing transaction attributes and environmental telemetry.

* **Primary Attributes:**
  * `transactionId`: Unique identifier (e.g. `tx_sim_1788606208147_1302`).
  * `amount`: Transaction monetary value (e.g. ₹500 to ₹100,000).
  * `currency`: Currency code (`INR`, `USD`).
  * `paymentMethod`: `card`, `upi`, `netbanking`, `wallet`, `emi`.
  * `gateway`: Primary gateway routing channel (`gateway_a`, `gateway_b`, `gateway_c`).
  * `failureReason`: One of 11 standardized reason codes:
    * *Temporary*: `gateway_timeout`, `network_error`, `issuer_unavailable`, `rate_limit_exceeded`, `concurrency_limit`.
    * *Customer Action Required*: `insufficient_funds`, `authentication_failed`, `otp_timeout`.
    * *Permanent / Terminal*: `card_expired`, `invalid_card_details`, `suspected_fraud`.
* **Telemetry & Environmental Signals:**
  * `networkLatency`: Gateway round-trip time in milliseconds (100ms – 2500ms).
  * `gatewayHealth`: Real-time health score of the payment gateway $[0.0, 1.0]$.
  * `issuerHealth`: Real-time health score of the issuing bank $[0.0, 1.0]$.
  * `recentGatewaySuccessRate`: 10-minute rolling success window $[0.0, 1.0]$.
  * `historicalRecoveryRate`: Merchant/customer baseline recovery rate $[0.0, 1.0]$.
  * `previousAttemptCount`: Number of retries already performed ($0, 1, 2, \dots$).
  * `timeSinceFailure`: Seconds elapsed since the failure occurred.

---

### Stage 2: Machine Learning Prediction Pipeline
The ML service operates as an independent microservice built on **Python 3.13 + FastAPI** running on port `8000`.

1. **Role of Machine Learning:**
   * The model has **only one responsibility**: Predict the probability $P(\text{recovery}) \in [0.01, 0.99]$.
   * The model **never makes recovery decisions directly**; it serves as a mathematical sensor.
2. **Preprocessing Pipeline (`ColumnTransformer`):**
   * **Numerical Features** (`StandardScaler`): `amount`, `network_latency`, `gateway_health`, `issuer_health`, `previous_attempt_count`, `recent_gateway_success_rate`, `historical_recovery_rate`, `time_since_failure`.
   * **Categorical Features** (`OneHotEncoder(handle_unknown="ignore")`): `payment_method`, `gateway`, `failure_reason`, `customer_action_required`.
3. **Model Classifier:**
   * Scikit-Learn **Logistic Regression** trained on 10,000 synthetic transaction scenarios with balanced weights.
   * Serialized as `recovery_model.joblib` accompanied by `model_metadata.json`.
4. **Resilience & Fallback Mechanism:**
   * If the model file is missing or the Python service is offline, the backend node client initiates an emergency deterministic heuristic fallback calculating calibrated probabilities so operations never halt.

---

### Stage 3: Node.js Recovery Decision Engine
The Recovery Decision Engine receives the ML probability $P(\text{recovery})$ and executes economic and heuristic evaluations.

#### A. Expected Recovery Value (ERV) Mathematical Model
The decision engine balances potential revenue recovered against operational retry costs:

$$\text{ERV} = \Big( P_{\text{recovery}} \times \text{Amount} \Big) - C_{\text{recovery}} - C_{\text{risk}}$$

Where:
* $\text{Amount}$ = Total transaction value.
* $C_{\text{recovery}} = ₹2.50$ (simulated network retry fee).
* $C_{\text{risk}} = ₹0.50$ (customer friction and issuer decline penalty cost).

#### B. Multi-Factor Action Space
The engine selects from 5 distinct recovery actions:
1. **`STOP`**:
   * Triggered when: Failure reason is permanent (`card_expired`, `invalid_card_details`, `suspected_fraud`), OR `previous_attempts >= 3`, OR $\text{ERV} \le 0$, OR $P_{\text{recovery}} < 0.15$.
   * Prevents wasteful penalties and protects customer goodwill.
2. **`CUSTOMER_ACTION_REQUIRED`**:
   * Triggered when: `failure_reason` is `insufficient_funds`, `authentication_failed`, or `customer_action_required == true`.
   * Action: Sends automated customer notification (e.g. SMS/WhatsApp payment link, top-up reminder) instead of retrying silently.
3. **`ALTERNATE_ROUTE`**:
   * Triggered when: Primary `gateway_health < 0.50` and $P_{\text{recovery}} \ge 0.30$.
   * Action: Reroutes transaction payload to a healthy secondary gateway (e.g. Gateway A $\rightarrow$ Gateway B).
4. **`RETRY_NOW`**:
   * Triggered when: $P_{\text{recovery}} \ge 0.70$, `gateway_health >= 0.70`, `issuer_health >= 0.70`, and $\text{ERV} > 0$.
   * Action: Immediate retry within 0–500ms while gateway and network are healthy.
5. **`RETRY_LATER`**:
   * Triggered when: Conditions are transiently degraded but recoverable (e.g. temporary timeout, issuer degraded).
   * Action: Schedules an intelligent backoff retry after a suggested cooldown (e.g. 15 minutes).

---

### Stage 4: Authoritative Safety Policy (Veto Layer)
The Safety Policy is an **authoritative gatekeeper** written in TypeScript. It possesses absolute veto power over the ML model and Decision Engine.

| Safety Rule | Invariant Constraint | Violation Action | System Rationale |
| :--- | :--- | :--- | :--- |
| **1. Transaction Status Check** | $\text{Status} \notin \{\text{RECOVERED}, \text{FAILED\_PERMANENTLY}\}$ | **`BLOCKED`** | Prevents double billing or retrying terminated transactions. |
| **2. Duplicate Check** | Transaction not marked recovered | **`BLOCKED`** | Idempotency guard against race conditions. |
| **3. Idempotency Guard** | $\text{Now} - \text{LastAttempt} > 300\text{s}$ | **`BLOCKED`** | Enforces atomic execution lock per transaction. |
| **4. Max Retry Limit** | $\text{previous\_attempts} < 3$ | **`BLOCKED`** | Strict card network compliance limit ($N \le 3$). |
| **5. Cooldown Window** | $\text{time\_since\_failure} \ge 300\text{s}$ or attempt $= 0$ | **`BLOCKED`** | Prevents rapid-fire retry storms during outages. |
| **6. Fraud & Risk Guard** | Not flagged for fraud & $\text{health} \ge 0.10$ | **`BLOCKED`** | Hard block on chargeback and AML risk vectors. |

If **any** check fails, the recovery attempt is marked **`BLOCKED`** and execution halts immediately.

---

### Stage 5: Simulated Recovery Execution
Because this project operates in a simulated environment, execution models real-world payment gateway dynamics without charging real money:

1. **Simulated Delay:** Introduces artificial network latency corresponding to the chosen action (e.g., immediate retry: 300ms; alternate routing: 800ms).
2. **Outcome Calculation:** The execution outcome is calculated using a conditioned stochastic formula based on the ML recovery probability, gateway health, and chosen action efficacy:
   $$P(\text{success} \mid \text{action}) = P_{\text{recovery}} \times \text{ActionEffectivenessFactor}$$
3. **State Mutation:**
   * On success: Transaction status transitions to `RECOVERED`, recovery value is attributed to merchant revenue.
   * On failure: Previous attempt count increments, status remains `FAILED` or transitions to `FAILED_PERMANENTLY` if max retries are reached.
4. **Tagging:** Every execution record is explicitly saved with `simulated: true`.

---

### Stage 6: Audit Trail, Benchmark Experiments & Fintech UI

#### A. Immutable Audit Trail
Every step of a transaction's lifecycle emits a structured audit record containing:
* `timestamp`: ISO-8601 UTC timestamp.
* `transactionId`: Unique transaction reference.
* `action`: Event name (`SIMULATOR_EVALUATION`, `SIMULATOR_EXECUTION`, `SAFETY_POLICY_CHECK`).
* `details`: Complete JSON snapshot of ML prediction features, decision engine weights, and safety results.

#### B. 5-Strategy Benchmark Experiments
The engine includes a benchmarking framework that evaluates 5 strategies on identical synthetic datasets ($N = 100 \text{ to } 50,000$ transactions):
1. **`NO_RETRY`**: Baseline with zero retries. Recovery rate: $0\%$.
2. **`FIXED_RETRY`**: Blindly retries all failed transactions 1 time.
3. **`RULE_BASED`**: Static business rules without ML scoring.
4. **`ML_BASED`**: Retries whenever ML probability exceeds a fixed threshold (e.g. 0.50).
5. **`ADAPTIVE_RECOVERY`** (This Engine): Jointly evaluates ML probability, Expected Net Recovery Value, and Safety Policy limits.
* **Key Metric:** Evaluates **Recovery Rate Uplift (%)** and **Cost per Recovery ($₹$)**. Adaptive Recovery consistently yields higher net recovered value with significantly fewer unnecessary retry attempts.

#### C. Fintech Operations Dashboard (`React + Vite`)
* **Top Navigation Bar:** Global status indicators (`Model Active`, `Safety Policy Active`, `Simulation Mode`).
* **Dashboard (`/`):** 4 live KPI cards (Total Recovered, Success Rate, Analyzed Count, System Health), recent decisions table, and volume graphs.
* **Interactive Simulator (`/simulator`):** 4-step progressive wizard allowing developers to configure transactions, inspect ML scoring, audit safety checks, and run live simulations.
* **Transactions (`/transactions` & `/transactions/:id`):** Filterable transaction directory with interactive 5-stage lifecycle timelines.
* **Experiments (`/experiments`):** Real-time benchmark execution interface with comparative performance charts.
* **Audit Logs (`/audit`):** Chronological system event explorer with collapsible JSON payload inspectors.

---

## 4. End-to-End Execution Trace Example

Here is a real walkthrough trace generated by the engine during verification:

```json
{
  "stage_1_transaction": {
    "transactionId": "tx_sim_1788606208147_1302",
    "amount": 60000.00,
    "currency": "INR",
    "payment_method": "upi",
    "failure_reason": "gateway_timeout",
    "gateway": "gateway_b",
    "gateway_health": 0.33,
    "issuer_health": 0.53
  },
  "stage_2_ml_prediction": {
    "recovery_probability": 0.689,
    "model_name": "recovery_logistic_regression",
    "model_version": "1.0.0"
  },
  "stage_3_decision_engine": {
    "expectedRecoveryValue": 41282.89,
    "recommendedAction": "RETRY_LATER",
    "suggestedDelay": 15,
    "decisionReason": "Recovery probability is moderate and a delayed retry is expected to provide better recovery value."
  },
  "stage_4_safety_policy": {
    "finalSafetyResult": "PASSED",
    "checks": {
      "transactionStatusCheck": true,
      "duplicateCheck": true,
      "idempotencyCheck": true,
      "retryLimitCheck": true,
      "cooldownCheck": true,
      "riskThresholdCheck": true
    },
    "failureReason": null
  },
  "stage_5_execution": {
    "simulated": true,
    "action": "RETRY_LATER",
    "outcome": "FAILURE",
    "recoveryValue": 0,
    "notes": "Delayed retry (15 min) failed. No value recovered."
  }
}
```

---

## 5. Local Setup & Service Verification

| Component | Technology | Default Port | Health URL |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19 + Vite + TypeScript | `5173` | [http://localhost:5173/](http://localhost:5173/) |
| **Backend Service** | Node.js + Express + TypeScript | `5000` | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| **ML Inference Service** | Python 3.13 + FastAPI + Uvicorn | `8000` | [http://localhost:8000/health](http://localhost:8000/health) |
| **API Documentation** | FastAPI Swagger UI | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) |
