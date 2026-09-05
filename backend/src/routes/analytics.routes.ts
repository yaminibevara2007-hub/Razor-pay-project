import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { ExperimentService } from "../services/experiment.service";

const router = Router();

router.get("/overview", (req, res) => analyticsController.overview(req, res));
router.get("/outcomes", (req, res) => analyticsController.outcomes(req, res));
router.get("/actions", (req, res) => analyticsController.actions(req, res));
router.get("/gateways", (req, res) => analyticsController.gateways(req, res));
router.get("/failures", (req, res) => analyticsController.failures(req, res));
router.get("/recovery-value", (req, res) => analyticsController.recoveryValue(req, res));

// GET /api/analytics/strategies — return recorded or default experiment strategy metrics
router.get("/strategies", async (req, res) => {
  try {
    const experiments = await ExperimentService.getExperiments();
    res.json({ success: true, data: experiments });
  } catch (e) {
    res.status(503).json({ success: false, message: "Strategy analytics unavailable" });
  }
});

export default router;
