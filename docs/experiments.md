# Recovery Strategy Experiments & Benchmark Methodology

## 1. Experimental Setup
To benchmark the effectiveness of adaptive recovery, the engine compares 5 distinct strategies across the **exact same synthetic dataset** generated with a deterministic pseudo-random seed:

1. **`NO_RETRY` (Lower Bound):** Zero retry attempts. Baseline zero recovery rate.
2. **`FIXED_RETRY` (Traditional Industry Heuristic):** Always retries every failed transaction once after a fixed 15-minute delay regardless of failure reason or gateway health.
3. **`RULE_BASED` (Heuristic Filter):** Retries only transient error categories (`temporary_gateway_error`, `gateway_timeout`, `rate_limit`) and stops permanent errors (`card_expired`, `suspected_fraud`).
4. **`ML_BASED` (Probability Threshold):** Retries only when ML predicted probability $\ge 0.50$.
5. **`ADAPTIVE_RECOVERY` (Our Engine):** Combines ML probability, Expected Recovery Value ($\text{ERV} > 0$), dynamic alternative routing when gateway health $< 0.50$, and strict 6-rule safety policy enforcement.

---

## 2. Benchmark Metrics Evaluated
- **Recovery Rate ($\%$):** $\frac{\text{Recovered Transactions}}{\text{Total Failed Transactions}}$
- **Recovered Value ($\$$):** Total transaction volume successfully salvaged.
- **Average Attempts:** Average retry attempts per transaction.
- **Unnecessary Attempts:** Retries executed on transactions that ultimately failed (representing wasted network cost).
- **Total Recovery Cost ($\$$):** Computed at $\$2.50$ per simulated retry attempt.
- **Cost per Recovery ($\$$):** $\frac{\text{Total Recovery Cost}}{\text{Recovered Count}}$
- **Stop Rate ($\%$):** Ratio of transactions halted before making costly, futile attempts.
