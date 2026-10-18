import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authRoutes } from './routes/auth.routes';
import { zoneRoutes } from './routes/zones.routes';
import { scanRoutes } from './routes/scans.routes';
import { alertRoutes } from './routes/alerts.routes';
import { caseRoutes } from './routes/cases.routes';
import { ledgerRoutes } from './routes/ledger.routes';
import { notificationRoutes } from './routes/notifications.routes';
import { statsRoutes } from './routes/stats.routes';
import { errorMiddleware } from './middleware/error';

export const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SentinelEye API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Error handler (must be last)
app.use(errorMiddleware);
