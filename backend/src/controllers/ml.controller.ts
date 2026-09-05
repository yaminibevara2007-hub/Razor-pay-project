import { Request, Response } from 'express';
import { mlService } from '../services/ml.service';
import { mlPredictionRequestSchema } from '../schemas/ml.schema';
import { MLServiceError } from '../ml/mlClient';

export const predict = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate the request using Zod
    const validationResult = mlPredictionRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.issues
      });
      return;
    }

    // 2. Call ml.service.ts
    const predictionResponse = await mlService.getPrediction(validationResult.data);

    // 3. Return the prediction response
    res.status(200).json(predictionResponse);
  } catch (error) {
    if (error instanceof MLServiceError) {
      // 5xx for ML service unavailable/errors
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        details: error.originalError?.message || error.originalError
      });
      return;
    }

    console.error('Unexpected error in predict controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
