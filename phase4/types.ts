/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4: API Request & Response Contracts
 */

import type { RestaurantRecord, PriceCategory } from '../src/types/restaurant.ts';
import type { FinalRecommendationRecord } from '../phase3/types.ts';

export interface HealthApiResponse {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  totalRestaurants: number;
  datasetIngestedAt: string;
  memoryUsageMb: number;
  geminiConfigured: boolean;
  version: string;
}

export interface FilterMetaApiResponse {
  locations: string[];
  cuisines: string[];
  priceCategories: PriceCategory[];
  priceBounds: {
    min: number;
    max: number;
    average: number;
  };
}

export interface PaginatedRestaurantsResponse {
  page: number;
  limit: number;
  totalMatches: number;
  totalPages: number;
  restaurants: RestaurantRecord[];
}

export interface RestaurantQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  locality?: string;
  cuisine?: string;
  priceCategory?: PriceCategory;
  minRating?: number;
  maxPrice?: number;
  hasTableBooking?: boolean;
  hasOnlineOrder?: boolean;
  sortBy?: 'rating' | 'votes' | 'cost_asc' | 'cost_desc';
}

export interface RecommendApiRequestBody {
  location?: string;
  cuisines?: string[];
  maxPrice?: number;
  minRating?: number;
  priceCategory?: PriceCategory;
  vibeOrOccasion?: string;
  dietaryPreferences?: string;
  mustHaveTableBooking?: boolean;
  mustHaveOnlineOrder?: boolean;
  freeformPrompt?: string;
}

export interface RecommendApiResponse {
  success: boolean;
  summary: string;
  recommendations: FinalRecommendationRecord[];
  totalCandidatesEvaluated: number;
  wasRelaxed: boolean;
  relaxedFactors: string[];
  cached: boolean;
  source: 'gemini-3.8-flash' | 'rule-based-fallback';
  executionTimeMs: number;
  alternativeSuggestions?: string[];
}

export interface AnalyticsInsightsResponse {
  totalRestaurants: number;
  averageRating: number;
  averageCostForTwo: number;
  topLocalities: { name: string; count: number; avgRating: number; avgCost: number }[];
  topCuisines: { name: string; count: number }[];
  priceDistribution: Record<PriceCategory, number>;
  ratingDistribution: Record<string, number>;
}
