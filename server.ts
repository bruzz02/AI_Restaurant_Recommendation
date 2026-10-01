/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Full-Stack Server Entry Point
 * Mounts Express API routes (/api/*) alongside Vite dev middleware / static dist.
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';
import { createServerApp } from './phase4/serverApp.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = createServerApp();

  if (!IS_PROD) {
    // In development: mount Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve static build from dist directory
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Running on http://0.0.0.0:${PORT} (mode: ${IS_PROD ? 'production' : 'development'})`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server Bootstrap Error]:', err);
  process.exit(1);
});
