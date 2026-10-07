import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import routes from './apiRoutes.js';
import { errorHandler, notFound } from '../middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
