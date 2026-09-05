# Machine Learning Pipeline — AI Revenue Recovery Engine

## 1. Overview
The ML service provides recovery probability predictions for failed transactions. It operates as an asynchronous FastAPI microservice located at `ml-service/`.

## 2. Feature Architecture
The pipeline takes 12 input features (9 numeric, 3 categorical):

### Numeric Features:
1. `amount`: Float transaction value.
2. `network_latency`: Latency in milliseconds (20–1000ms).
3. `gateway_health`: Float score [0.0, 1.0] representing gateway reliability.
4. `issuer_health`: Float score [0.0, 1.0] representing card issuing bank reliability.
5. `customer_action_required`: Binary flag (0 or 1).
6. `previous_attempt_count`: Integer retry attempts made (0–5).
7. `recent_gateway_success_rate`: Float rolling success rate [0.3, 1.0].
8. `historical_recovery_rate`: Float baseline recovery rate [0.2, 0.9].
9. `time_since_failure`: Integer seconds elapsed since failure.

### Categorical Features:
10. `payment_method`: `['card', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'wallet']`.
11. `gateway`: `['gateway_a', 'gateway_b', 'gateway_c']`.
12. `failure_reason`: `['insufficient_funds', 'network_error', 'gateway_timeout', 'issuer_declined', 'card_expired', 'suspected_fraud', 'authentication_failed', 'rate_limit', 'temporary_gateway_error']`.

---

## 3. Preprocessing & Model Specification
- **Preprocessing:** Scikit-Learn `ColumnTransformer` applying `StandardScaler` on numerical features and `OneHotEncoder(handle_unknown='ignore')` on categorical features.
- **Model:** `LogisticRegression(max_iter=1000, solver='lbfgs', random_state=42, class_weight='balanced')`.
- **Serialization:** Saved to `ml-service/models/recovery_model.joblib` alongside JSON metadata.

---

## 4. Evaluation Metrics (Synthetic Dataset)
Trained on 10,000 synthetic rows (8,000 train / 2,000 test stratified split):

- **Accuracy:** ~68.1%
- **Precision:** ~53.7%
- **Recall (Sensitivity):** ~83.8%
- **F1 Score:** ~0.655
- **ROC-AUC:** ~0.778

*Notice:* Synthetic evaluation metrics indicate high recall on identifying recoverable transactions while maintaining balanced cost efficiency.
