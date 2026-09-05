import { Router } from "express";
import { experimentController } from "../controllers/experiment.controller";

const router = Router();

// POST /api/experiments/run — run comparison across 5 strategies on synthetic dataset
router.post("/run", (req, res) => experimentController.run(req, res));

// GET /api/experiments — list past experiment results
router.get("/", (req, res) => experimentController.getAll(req, res));

export default router;
