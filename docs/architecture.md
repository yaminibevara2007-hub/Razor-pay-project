# System Architecture — AI Revenue Recovery Engine

## 1. Principles of Design
1. **Decoupled Intelligence:** The Machine Learning model **only** predicts recovery probability. It never directly executes actions.
2. **Deterministic Business Authority:** The Node.js Recovery Decision Engine computes **Expected Recovery Value (ERV)** and selects candidate actions based on multi-factor heuristics.
3. **Safety Supremacy:** The Safety Policy evaluates hard business invariants (Idempotency, Cooldowns, Maximum Retries, Fraud Flags) and possesses veto power over ML and Decision recommendations.
4. **Transparent Auditability:** Every step in the decision lifecycle (`PREDICTION_GENERATED` → `RECOVERY_DECISION_CREATED` → `SAFETY_CHECK_COMPLETED` → `SIMULATED_RECOVERY_EXECUTED`) produces an immutable audit record.
5. **Non-Violative Simulation:** All recovery executions are explicitly flagged with `simulated = true`. No external monetary transfer APIs are invoked.

---

## 2. Recovery Decision Logic & Formulas

### Expected Recovery Value (ERV) Formula:
$$\text{ERV} = (P_{\text{recovery}} \times \text{Amount}) - C_{\text{recovery}} - C_{\text{risk}}$$

Where:
- $P_{\text{recovery}} \in [0.01, 0.99]$: ML-inferred probability of successful recovery.
- $\text{Amount}$: Transaction value.
- $C_{\text{recovery}} = \$2.50$: Base retry processing cost (simulated).
- $C_{\text{risk}} = \$0.50$: Friction & retry risk cost (simulated).

### Decision Rules:
1. **Permanent or Fatal Failures:** `card_expired`, `suspected_fraud`, or $\text{previous\_attempts} \ge 3 \implies \mathbf{STOP}$.
2. **Negative Expected Value:** $\text{ERV} \le 0 \text{ or } P_{\text{recovery}} < 0.15 \implies \mathbf{STOP}$.
3. **Customer Intervention:** $\text{customer\_action\_required} = \text{true} \implies \mathbf{CUSTOMER\_ACTION\_REQUIRED}$.
4. **Degraded Primary Route:** $\text{gateway\_health} < 0.50 \text{ and } P_{\text{recovery}} \ge 0.30 \implies \mathbf{ALTERNATE\_ROUTE}$.
5. **High Confidence & Healthy Network:** $P_{\text{recovery}} \ge 0.70 \text{ and } \text{gateway\_health} \ge 0.70 \text{ and } \text{issuer\_health} \ge 0.70 \text{ and } \text{ERV} > 0 \implies \mathbf{RETRY\_NOW}$.
6. **Moderate Conditions:** Default to $\mathbf{RETRY\_LATER}$ with a 15-minute suggested cooldown.

---

## 3. Safety Invariants & Policy Checks

| Check | Condition | Failure Action |
|---|---|---|
| **Transaction Status** | Status $\notin \{\text{RECOVERED}, \text{FAILED\_PERMANENTLY}\}$ | $\mathbf{BLOCKED}$ (Terminal state) |
| **Duplicate Check** | Transaction has not been marked recovered in memory/DB | $\mathbf{BLOCKED}$ (Already recovered) |
| **Idempotency Guard** | $\text{Now} - \text{LastAttemptTime} > 5 \text{ min}$ | $\mathbf{BLOCKED}$ (Attempt in cooldown) |
| **Retry Limit** | $\text{previous\_attempts} < 3$ | $\mathbf{BLOCKED}$ (Max retries exceeded) |
| **Cooldown Window** | $\text{time\_since\_failure} \ge 300\text{s}$ or attempt $= 0$ | $\mathbf{BLOCKED}$ (Cooldown active) |
| **Risk Guard** | Not flagged for suspected fraud & health above 0.10 | $\mathbf{BLOCKED}$ (Risk threshold breached) |
