import { MLClient, MLServiceError } from './src/ml/mlClient';
import { PredictionRequest } from './src/ml/types';

async function runTests() {
  console.log('--- TEST 1: ML SERVICE AVAILABLE ---');
  // Assuming ML service is running locally on port 8000 for this test
  process.env.ML_SERVICE_URL = 'http://localhost:8000';
  const client1 = new MLClient();
  const validRequest: PredictionRequest = {
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

  try {
    const result = await client1.predict(validRequest);
    console.log('SUCCESS: Received valid prediction:');
    console.log(result);
  } catch (error: any) {
    console.error('FAILED:', error.message);
  }

  console.log('\n--- TEST 2: ML SERVICE UNAVAILABLE ---');
  process.env.ML_SERVICE_URL = 'http://localhost:9999'; // Invalid port
  const client2 = new MLClient();
  try {
    await client2.predict(validRequest);
    console.error('FAILED: Expected an error but got a success response');
  } catch (error: any) {
    if (error instanceof MLServiceError && error.message.includes('unavailable')) {
      console.log('SUCCESS: Received expected unavailable error:', error.message);
    } else {
      console.error('FAILED: Expected unavailable error, got:', error);
    }
  }

  console.log('\n--- TEST 3: INVALID RESPONSE ---');
  // Use a public URL that won't return our PredictionResponse
  process.env.ML_SERVICE_URL = 'https://example.com';
  const client3 = new MLClient();
  try {
    await client3.predict(validRequest);
    console.error('FAILED: Expected an error but got a success response');
  } catch (error: any) {
    if (error instanceof MLServiceError) {
      console.log('SUCCESS: Received expected MLServiceError:', error.message);
    } else {
      console.error('FAILED: Expected MLServiceError, got:', error);
    }
  }
}

runTests();
