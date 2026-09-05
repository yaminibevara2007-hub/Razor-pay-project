import axios, { AxiosError } from 'axios';

const BACKEND_URL = 'http://localhost:5000';

async function runTests() {
  const validRequest = {
    amount: 1500.5,
    payment_method: 'credit_card',
    gateway: 'stripe',
    failure_reason: 'insufficient_funds',
    network_latency: 120,
    gateway_health: 0.95,
    issuer_health: 0.88,
    previous_attempt_count: 1,
    recent_gateway_success_rate: 0.92,
    historical_recovery_rate: 0.45,
    time_since_failure: 3600,
    customer_action_required: false
  };

  console.log('--- TEST 1: Valid prediction ---');
  try {
    const res = await axios.post(`${BACKEND_URL}/api/ml/predict`, validRequest);
    console.log('SUCCESS: status', res.status, res.data);
  } catch (err: any) {
    console.error('FAILED:', err.response?.data || err.message);
  }

  console.log('\n--- TEST 2: Invalid amount ---');
  try {
    const invalidAmountReq = { ...validRequest, amount: -10 };
    await axios.post(`${BACKEND_URL}/api/ml/predict`, invalidAmountReq);
    console.error('FAILED: expected 400 error');
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('SUCCESS: Got 400 error.', JSON.stringify(err.response.data).substring(0, 100) + '...');
    } else {
      console.error('FAILED:', err.response?.data || err.message);
    }
  }

  console.log('\n--- TEST 3: Missing field ---');
  try {
    const missingFieldReq = { ...validRequest };
    delete (missingFieldReq as any).payment_method;
    await axios.post(`${BACKEND_URL}/api/ml/predict`, missingFieldReq);
    console.error('FAILED: expected 400 error');
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log('SUCCESS: Got 400 error.', JSON.stringify(err.response.data).substring(0, 100) + '...');
    } else {
      console.error('FAILED:', err.response?.data || err.message);
    }
  }

  console.log('\n--- TEST 5: Health endpoint ---');
  try {
    const res = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('SUCCESS: status', res.status, res.data);
  } catch (err: any) {
    console.error('FAILED:', err.response?.data || err.message);
  }

  console.log('\n--- Note: To run TEST 4, kill the FastAPI server and hit the endpoint manually. ---');
}

runTests();
