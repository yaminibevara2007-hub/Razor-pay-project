import { Router } from "express";
import { transactionController } from "../controllers/transaction.controller";

const router = Router();

// GET /api/transactions — list transactions
router.get("/", (req, res) => transactionController.getAll(req, res));

// GET /api/transactions/:id — get transaction details
router.get("/:id", (req, res) => transactionController.getById(req, res));

export default router;
