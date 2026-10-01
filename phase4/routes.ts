/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4: Express API Router
 */

import { Router, type Request, type Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import type { RestaurantRecord } from '../src/types/restaurant.ts';
import type { DatasetSummary, MetadataIndices } from '../phase1/types.ts';
import type {
  HealthApiResponse,
  FilterMetaApiResponse,
  PaginatedRestaurantsResponse,
  RecommendApiRequestBody,
  RecommendApiResponse,
  AnalyticsInsightsResponse
} from './types.ts';
import { RecommendationOrchestrator } from '../phase3/recommendationEngine.ts';
import { MemoryCache } from './cache.ts';

const WORKSPACE_ROOT = path.resolve(process.cwd());
const RESTAURANTS_FILE = path.join(WORKSPACE_ROOT, 'src/data/restaurants.json');
const SUMMARY_FILE = path.join(WORKSPACE_ROOT, 'src/data/dataset_summary.json');
const INDICES_FILE = path.join(WORKSPACE_ROOT, 'src/data/metadata_indices.json');

export function createApiRouter(): Router {
  const router = Router();
  const startTime = Date.now();

  // Load static data
  let restaurants: RestaurantRecord[] = [];
  let summary: DatasetSummary | null = null;
  let indices: MetadataIndices | null = null;

  try {
    if (fs.existsSync(RESTAURANTS_FILE)) {
      restaurants = JSON.parse(fs.readFileSync(RESTAURANTS_FILE, 'utf-8'));
    }
    if (fs.existsSync(SUMMARY_FILE)) {
      summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'));
    }
    if (fs.existsSync(INDICES_FILE)) {
      indices = JSON.parse(fs.readFileSync(INDICES_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[API Router] Error loading initial datasets:', err);
  }

  // Pre-index restaurants by ID for O(1) lookup
  const restaurantMap = new Map<string, RestaurantRecord>();
  for (const r of restaurants) {
    restaurantMap.set(r.id, r);
  }

  // Initialize recommendation orchestrator & cache
  const orchestrator = new RecommendationOrchestrator(restaurants);
  const recommendationCache = new MemoryCache<RecommendApiResponse>(10 * 60 * 1000); // 10 minutes TTL

  // -------------------------------------------------------------
  // 1. GET /api/health
  // -------------------------------------------------------------
  router.get('/health', (_req: Request, res: Response) => {
    const memory = process.memoryUsage();
    const envKey = process.env.GEMINI_API_KEY;
    const hasKey = Boolean(envKey && envKey.trim() !== '' && envKey !== 'MY_GEMINI_API_KEY');

    const health: HealthApiResponse = {
      status: restaurants.length > 0 ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      totalRestaurants: restaurants.length,
      datasetIngestedAt: summary?.ingestedAt || 'unknown',
      memoryUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
      geminiConfigured: hasKey,
      version: '1.0.0'
    };

    res.json(health);
  });

  // -------------------------------------------------------------
  // 2. GET /api/meta/filters
  // -------------------------------------------------------------
  router.get('/meta/filters', (_req: Request, res: Response) => {
    const meta: FilterMetaApiResponse = {
      locations: indices?.locations || [],
      cuisines: indices?.cuisines || [],
      priceCategories: ['budget', 'moderate', 'upscale', 'luxury'],
      priceBounds: indices?.priceRanges || {
        min: 100,
        max: 5000,
        average: summary?.averageCostForTwo || 469
      }
    };
    res.json(meta);
  });

  // -------------------------------------------------------------
  // 3. GET /api/restaurants (Filterable & Paginated)
  // -------------------------------------------------------------
  router.get('/restaurants', (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const locality = ((req.query.locality as string) || '').toLowerCase().trim();
    const cuisine = ((req.query.cuisine as string) || '').toLowerCase().trim();
    const priceCategory = req.query.priceCategory as string;
    const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string, 10) : undefined;
    const hasTableBooking = req.query.hasTableBooking === 'true';
    const hasOnlineOrder = req.query.hasOnlineOrder === 'true';
    const sortBy = (req.query.sortBy as string) || 'rating';

    let filtered = restaurants.filter((r) => {
      if (locality && !r.locality.toLowerCase().includes(locality)) return false;
      if (cuisine && !r.cuisines.some((c) => c.toLowerCase().includes(cuisine))) return false;
      if (priceCategory && r.priceCategory !== priceCategory) return false;
      if (minRating !== undefined && (r.rating === null || r.rating < minRating)) return false;
      if (maxPrice !== undefined && r.costForTwo > maxPrice) return false;
      if (hasTableBooking && !r.hasTableBooking) return false;
      if (hasOnlineOrder && !r.hasOnlineOrder) return false;

      if (search) {
        const matchName = r.name.toLowerCase().includes(search);
        const matchLoc = r.locality.toLowerCase().includes(search);
        const matchCuisine = r.cuisines.some((c) => c.toLowerCase().includes(search));
        const matchDish = r.popularDishes.some((d) => d.toLowerCase().includes(search));
        if (!matchName && !matchLoc && !matchCuisine && !matchDish) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'cost_asc') return a.costForTwo - b.costForTwo;
      if (sortBy === 'cost_desc') return b.costForTwo - a.costForTwo;
      if (sortBy === 'votes') return b.votes - a.votes;
      // Default: rating desc, secondary votes desc
      const rA = a.rating ?? 0;
      const rB = b.rating ?? 0;
      if (rB !== rA) return rB - rA;
      return b.votes - a.votes;
    });

    const totalMatches = filtered.length;
    const totalPages = Math.ceil(totalMatches / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pageItems = filtered.slice(startIndex, startIndex + limit);

    const response: PaginatedRestaurantsResponse = {
      page,
      limit,
      totalMatches,
      totalPages,
      restaurants: pageItems
    };

    res.json(response);
  });

  // -------------------------------------------------------------
  // 4. GET /api/restaurants/:id
  // -------------------------------------------------------------
  router.get('/restaurants/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const found = restaurantMap.get(id);
    if (!found) {
      res.status(404).json({ error: `Restaurant with ID "${id}" was not found.` });
      return;
    }
    res.json(found);
  });

  // -------------------------------------------------------------
  // 5. POST /api/recommend (Phase 2 + Phase 3 Orchestration)
  // -------------------------------------------------------------
  router.post('/recommend', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as RecommendApiRequestBody;

      // Generate deterministic cache key
      const cacheKey = JSON.stringify({
        l: body.location?.toLowerCase().trim(),
        c: body.cuisines?.map((x) => x.toLowerCase().trim()).sort(),
        mp: body.maxPrice,
        mr: body.minRating,
        pc: body.priceCategory,
        vibe: body.vibeOrOccasion?.toLowerCase().trim(),
        tb: body.mustHaveTableBooking,
        oo: body.mustHaveOnlineOrder,
        prompt: body.freeformPrompt?.toLowerCase().trim()
      });

      const cachedResult = recommendationCache.get(cacheKey);
      if (cachedResult) {
        res.json({
          ...cachedResult,
          cached: true
        });
        return;
      }

      // Execute Orchestrator
      const orchestratorResult = await orchestrator.getRecommendations({
        location: body.location,
        cuisines: body.cuisines,
        maxPrice: body.maxPrice,
        minRating: body.minRating,
        priceCategory: body.priceCategory,
        vibeOrOccasion: body.vibeOrOccasion,
        dietaryPreferences: body.dietaryPreferences,
        mustHaveTableBooking: body.mustHaveTableBooking,
        mustHaveOnlineOrder: body.mustHaveOnlineOrder,
        freeformPrompt: body.freeformPrompt
      });

      const responsePayload: RecommendApiResponse = {
        success: true,
        summary: orchestratorResult.summary,
        recommendations: orchestratorResult.recommendations,
        totalCandidatesEvaluated: orchestratorResult.totalCandidatesEvaluated,
        wasRelaxed: orchestratorResult.wasRelaxed,
        relaxedFactors: orchestratorResult.relaxedFactors,
        cached: false,
        source: orchestratorResult.source,
        executionTimeMs: orchestratorResult.executionTimeMs,
        alternativeSuggestions: orchestratorResult.alternativeSuggestions
      };

      // Store in memory cache
      recommendationCache.set(cacheKey, responsePayload);

      res.json(responsePayload);
    } catch (err: any) {
      console.error('[API Router] Error processing /api/recommend:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations. Please try again.',
        details: err?.message || 'Unknown error'
      });
    }
  });

  // -------------------------------------------------------------
  // 6. GET /api/analytics/insights
  // -------------------------------------------------------------
  router.get('/analytics/insights', (_req: Request, res: Response) => {
    if (!summary) {
      res.status(503).json({ error: 'Dataset summary unavailable' });
      return;
    }

    // Compute top locality details (average rating and cost per locality)
    const localityStats = new Map<string, { count: number; sumRating: number; ratedCount: number; sumCost: number }>();
    for (const r of restaurants) {
      const loc = r.locality || 'Other';
      const curr = localityStats.get(loc) || { count: 0, sumRating: 0, ratedCount: 0, sumCost: 0 };
      curr.count++;
      curr.sumCost += r.costForTwo;
      if (r.rating !== null) {
        curr.sumRating += r.rating;
        curr.ratedCount++;
      }
      localityStats.set(loc, curr);
    }

    const topLocalities = summary.topLocations.slice(0, 10).map((loc) => {
      const stat = localityStats.get(loc.name);
      const avgR = stat && stat.ratedCount > 0 ? Number((stat.sumRating / stat.ratedCount).toFixed(2)) : summary!.averageRating;
      const avgC = stat && stat.count > 0 ? Math.round(stat.sumCost / stat.count) : summary!.averageCostForTwo;
      return {
        name: loc.name,
        count: loc.count,
        avgRating: avgR,
        avgCost: avgC
      };
    });

    const response: AnalyticsInsightsResponse = {
      totalRestaurants: summary.totalUniqueRestaurants,
      averageRating: summary.averageRating,
      averageCostForTwo: summary.averageCostForTwo,
      topLocalities,
      topCuisines: summary.topCuisines.slice(0, 12),
      priceDistribution: summary.priceDistribution,
      ratingDistribution: summary.ratingDistribution
    };

    res.json(response);
  });

  return router;
}
