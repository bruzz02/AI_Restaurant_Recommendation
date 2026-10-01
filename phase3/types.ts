/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: LLM Reasoning & Synthesis Types
 */

import type { RestaurantRecord, PriceCategory } from '../src/types/restaurant.ts';

export interface UserLLMRequest {
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

export interface LLMRecommendationItem {
  restaurantId: string;
  restaurantName: string;
  matchScore: number;
  whyRecommended: string;
  highlightedDishes: string[];
  bestFor: string;
  priceVerdict: string;
  diningTip?: string;
}

export interface LLMSynthesisOutput {
  summary: string;
  recommendations: LLMRecommendationItem[];
  alternativeSuggestions?: string[];
}

export interface FinalRecommendationRecord extends RestaurantRecord {
  matchScore: number;
  whyRecommended: string;
  highlightedDishes: string[];
  bestFor: string;
  priceVerdict: string;
  diningTip?: string;
  source: 'gemini-3.8-flash' | 'rule-based-fallback';
}

export interface RecommendationServiceResult {
  summary: string;
  recommendations: FinalRecommendationRecord[];
  totalCandidatesEvaluated: number;
  wasRelaxed: boolean;
  relaxedFactors: string[];
  source: 'gemini-3.8-flash' | 'rule-based-fallback';
  executionTimeMs: number;
  alternativeSuggestions?: string[];
}
