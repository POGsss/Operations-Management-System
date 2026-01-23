import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
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

// Protected route example
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    userId: req.user.id
  });
});

export default app;