/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Vercel Serverless Function entry point for Express API routes (/api/*)
 */

import { createServerApp } from '../phase4/serverApp.ts';

const app = createServerApp();

export default app;
