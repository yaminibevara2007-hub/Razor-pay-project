import express from 'express';
import cors from 'cors';
import mlRoutes from './routes/ml.routes';
import recoveryRoutes from './routes/recovery.routes';
import simulatorRoutes from './routes/simulator.routes';
import transactionRoutes from './routes/transaction.routes';
import analyticsRoutes from './routes/analytics.routes';
import experimentRoutes from './routes/experiment.routes';
import { transactionController } from './controllers/transaction.controller';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/ml', mlRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/experiments', experimentRoutes);
app.get('/api/recovery-decisions', (req, res) => transactionController.getDecisions(req, res));
app.get('/api/audit', (req, res) => transactionController.getAuditLogs(req, res));

export default app;
