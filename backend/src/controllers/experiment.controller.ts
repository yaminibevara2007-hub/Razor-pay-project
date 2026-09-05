import { Request, Response } from "express";
import { z } from "zod";
import { ExperimentService } from "../services/experiment.service";

const RunExperimentSchema = z.object({
  experimentName: z.string().min(1).default("experiment"),
  datasetSize: z.number().int().min(100).max(50000).default(1000),
});

export class ExperimentController {
  async run(req: Request, res: Response): Promise<void> {
    const parsed = RunExperimentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.issues });
      return;
    }
    try {
      const { experimentName, datasetSize } = parsed.data;
      const results = await ExperimentService.runExperiment(datasetSize, experimentName);
      res.json({
        success: true,
        notice: "Results are based on SIMULATED data and do not represent production payment performance.",
        results,
      });
    } catch (e) {
      console.error("[ExperimentController.run]", e);
      res.status(500).json({ success: false, message: "Experiment failed" });
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const data = await ExperimentService.getExperiments();
      res.json({ success: true, data });
    } catch (e) {
      res.status(503).json({ success: false, message: "Experiments unavailable (DB may be offline)" });
    }
  }
}

export const experimentController = new ExperimentController();
