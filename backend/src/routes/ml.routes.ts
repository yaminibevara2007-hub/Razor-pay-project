import { Router } from 'express';
import { predict } from '../controllers/ml.controller';

const router = Router();

router.post('/predict', predict);

export default router;
