/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4: Express Application Factory
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createApiRouter } from './routes.ts';

export function createServerApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // Mount API router under /api
  const apiRouter = createApiRouter();
  app.use('/api', apiRouter);

  // Fallback 404 for unmatched /api routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Express Global Error]:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Unknown error'
    });
  });

  return app;
}
