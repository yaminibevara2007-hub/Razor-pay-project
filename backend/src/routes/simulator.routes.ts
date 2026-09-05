import { Router } from "express";
import { simulatorController } from "../controllers/simulator.controller";

const router = Router();

// POST /api/simulator/transaction — generate synthetic failed transaction
router.post("/transaction", (req, res) => simulatorController.generateTransaction(req, res));

// POST /api/simulator/evaluate — evaluate ML prediction, recovery decision, safety policy
router.post("/evaluate", (req, res) => simulatorController.evaluate(req, res));

// POST /api/simulator/execute — simulate recovery execution
router.post("/execute", (req, res) => simulatorController.execute(req, res));

export default router;
