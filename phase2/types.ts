/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 2: Candidate Retrieval & Scoring Interfaces
 */

import type { RestaurantRecord, PriceCategory } from '../src/types/restaurant.ts';

export interface CandidateFilterOptions {
  location?: string;
  cuisines?: string[];
  maxPrice?: number;
  minRating?: number;
  priceCategory?: PriceCategory;
  requireTableBooking?: boolean;
  requireOnlineOrder?: boolean;
  searchKeyword?: string;
  limit?: number; // Default 15-20
  allowRelaxation?: boolean; // Default true
}

export interface ScoredCandidate {
  restaurant: RestaurantRecord;
  compositeScore: number;       // Normalized 0 - 100
  bayesianRating: number;       // Damped rating considering vote count
  cuisineMatchScore: number;    // 0 - 1.0
  budgetMatchScore: number;     // 0 - 1.0
  popularityScore: number;      // Log-scaled vote score 0 - 1.0
  matchBreakdown: {
    locationMatch: boolean;
    cuisineOverlap: string[];
    priceDifference: number; // Positive means below maxPrice, negative means exceeded
  };
}

export interface RetrievalResult {
  candidates: ScoredCandidate[];
  totalMatchesFound: number;
  isRelaxed: boolean;
  relaxedFactors: string[];
  executionTimeMs: number;
}

export interface CompressedLLMContextItem {
  id: string;
  name: string;
  locality: string;
  cuisines: string[];
  costForTwo: number;
  rating: number | string;
  votes: number;
  types: string[];
  dishes: string[];
  tableBooking: boolean;
  sampleReview?: string;
}

export interface LLMContextPayload {
  userQuerySummary: string;
  candidateCount: number;
  wasRelaxed: boolean;
  candidates: CompressedLLMContextItem[];
}
