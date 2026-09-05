import { Request, Response } from "express";
import { AnalyticsService } from "../services/analytics.service";

export class AnalyticsController {
  async overview(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getOverview();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable (DB may be offline)" });
    }
  }

  async outcomes(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getOutcomes();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable" });
    }
  }

  async actions(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getActions();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable" });
    }
  }

  async gateways(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getGateways();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable" });
    }
  }

  async failures(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getFailures();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable" });
    }
  }

  async recoveryValue(req: Request, res: Response): Promise<void> {
    try {
      const data = await AnalyticsService.getRecoveryValueOverTime();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Analytics unavailable" });
    }
  }
}

export const analyticsController = new AnalyticsController();
