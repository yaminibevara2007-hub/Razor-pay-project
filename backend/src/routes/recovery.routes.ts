import { Router } from "express";
import { recoveryController } from "../controllers/recovery.controller";

const router = Router();

/**
 * POST /api/recovery/evaluate
 * Full recovery pipeline: ML Prediction → Decision Engine → Safety Policy → Response
 */
router.post("/evaluate", (req, res) => recoveryController.evaluate(req, res));

export default router;
