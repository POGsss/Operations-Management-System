import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import customerRoutes from './routes/customers.js';
import jobOrderRoutes from './routes/jobOrders.js';
import inventoryRoutes from './routes/inventory.js';
import workflowRoutes from './routes/workflow.js';
import pricingRoutes from './routes/pricing.js';
import estimateRoutes from './routes/estimates.js';
import billingRoutes from './routes/billing.js';
import performanceRoutes from './routes/performance.js';
import reportsRoutes from './routes/reports.js';
import { verifyToken } from './middlewares/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Auth routes (no authentication required)
app.use('/api/auth', authRoutes);

// Branch routes (authentication required)
app.use('/api/branches', branchRoutes);

// Customer routes (authentication required)
app.use('/api/customers', customerRoutes);

// Job Order routes (authentication required)
app.use('/api/jobs', jobOrderRoutes);

// Inventory routes (authentication required)
app.use('/api/inventory', inventoryRoutes);

// Workflow routes (authentication required)
app.use('/api/workflow', workflowRoutes);

// Pricing routes (authentication required)
app.use('/api/pricing', pricingRoutes);

// Estimates routes (authentication required)
app.use('/api/estimates', estimateRoutes);

// Billing routes (authentication required)
app.use('/api/billing', billingRoutes);

// Performance tracking routes (authentication required)
app.use('/api/performance', performanceRoutes);

// Reports routes (authentication required)
app.use('/api/reports', reportsRoutes);

// Protected route example
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    userId: req.user.id
  });
});

export default app;