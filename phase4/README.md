# Phase 4: Backend API & Service Layer

## Overview
Phase 4 implements a robust, production-grade Express REST API that serves data from Phase 1, executes candidate filtering from Phase 2, and invokes LLM reasoning from Phase 3.

## Endpoints
- **`GET /api/health`**: Health status, uptime, dataset record count, and memory metrics.
- **`GET /api/meta/filters`**: Pre-sorted distinct locations (56+), cuisines (80+), and price range bounds for client dropdowns and autocomplete.
- **`GET /api/restaurants`**: Paginated & filterable list of restaurants with sorting (`rating`, `votes`, `cost_asc`, `cost_desc`).
- **`GET /api/restaurants/:id`**: Single restaurant detail with complete review excerpts and dishes.
- **`POST /api/recommend`**: Core recommendation endpoint connecting user preferences + vibe/occasion prompt to Phase 2 retrieval and Phase 3 Gemini 3.8 Flash synthesis.
- **`GET /api/analytics/insights`**: Aggregated locality, cuisine, and pricing distribution insights for data visualization.

## Features
- **In-Memory Query Cache**: LRU/TTL cache reduces latency and token cost for identical user requests.
- **Input Sanitization**: Validates pagination, limits, and numeric ranges.
- **Full-Stack Vite Dev Server Integration**: Express mounts `vite.middlewares` in dev mode on port 3000.

## How to Run Tests
```bash
npm run test:phase4
# or
npx tsx phase4/tests/phase4.test.ts
```
