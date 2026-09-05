import { MLClient } from '../ml/mlClient';
import { PredictionRequest, PredictionResponse } from '../ml/types';

// We instantiate a new MLClient for the service. It evaluates ML_SERVICE_URL lazily.
const mlClient = new MLClient();

export class MLService {
  async getPrediction(request: PredictionRequest): Promise<PredictionResponse> {
    return await mlClient.predict(request);
  }
}

export const mlService = new MLService();
