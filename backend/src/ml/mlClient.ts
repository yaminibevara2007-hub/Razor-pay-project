import axios, { AxiosError } from 'axios';
import { PredictionRequest, PredictionResponse } from './types';

export class MLServiceError extends Error {
  constructor(message: string, public readonly statusCode?: number, public readonly originalError?: any) {
    super(message);
    this.name = 'MLServiceError';
  }
}

export class MLClient {
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    try {
      const response = await axios.post<PredictionResponse>(
        `${baseUrl}/predict`,
        request,
        {
          timeout: 5000, // 5 seconds timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Validate basic shape of response to ensure it's not an invalid/unexpected response
      if (
        response.data &&
        typeof response.data.recovery_probability === 'number' &&
        typeof response.data.model_name === 'string' &&
        typeof response.data.model_version === 'string'
      ) {
        return response.data;
      } else {
        throw new MLServiceError('Invalid response format from ML service');
      }

    } catch (error) {
      if (error instanceof MLServiceError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new MLServiceError('ML service request timed out', undefined, error);
        }
        if (!error.response) {
          throw new MLServiceError('ML service unavailable', undefined, error);
        }
        throw new MLServiceError(
          `ML service returned an error: ${error.message}`,
          error.response.status,
          error.response.data
        );
      }

      throw new MLServiceError('Unexpected error communicating with ML service', undefined, error);
    }
  }
}

export const mlClient = new MLClient();
