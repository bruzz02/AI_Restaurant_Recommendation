/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 2: Hybrid Candidate Retrieval and Scoring Engine
 */

import type { RestaurantRecord } from '../src/types/restaurant.ts';
import type {
  CandidateFilterOptions,
  ScoredCandidate,
  RetrievalResult,
  LLMContextPayload,
  CompressedLLMContextItem
} from './types.ts';
import { calculateCuisineMatchScore } from './cuisineTaxonomy.ts';

// Dataset baseline constants derived from Phase 1 ingestion
const DATASET_MEAN_RATING = 3.63;
const BAYESIAN_PRIOR_WEIGHT = 25; // Minimum vote weight to pull toward mean
const MAX_REFERENCE_VOTES = 15000;

/**
 * Calculates Bayesian Damped Rating
 * Prevents 1-vote 5.0★ outliers from beating 4.5★ favorites with thousands of votes.
 */
export function calculateBayesianRating(rating: number | null, votes: number): number {
  const actualRating = rating ?? DATASET_MEAN_RATING;
  const damped = (votes * actualRating + BAYESIAN_PRIOR_WEIGHT * DATASET_MEAN_RATING) / (votes + BAYESIAN_PRIOR_WEIGHT);
  return Number(damped.toFixed(2));
}

/**
 * Computes a normalized popularity score between 0.0 and 1.0 based on log votes
 */
export function calculatePopularityScore(votes: number): number {
  if (votes <= 0) return 0.05;
  const score = Math.log10(votes + 1) / Math.log10(MAX_REFERENCE_VOTES + 1);
  return Number(Math.min(1.0, Math.max(0.0, score)).toFixed(3));
}

/**
 * Computes budget compatibility score
 */
export function calculateBudgetScore(costForTwo: number, maxPrice?: number): number {
  if (!maxPrice || maxPrice <= 0) return 1.0;

  if (costForTwo <= maxPrice) {
    // Perfect match, with slight preference for not being drastically lower than intended experience
    const ratio = costForTwo / maxPrice;
    return Number((0.85 + 0.15 * ratio).toFixed(3));
  } else {
    // Penalty for exceeding budget
    const overage = (costForTwo - maxPrice) / maxPrice;
    const score = Math.max(0.0, 1.0 - overage * 1.5);
    return Number(score.toFixed(3));
  }
}

/**
 * Checks location compatibility
 */
export function checkLocationMatch(restaurant: RestaurantRecord, targetLocation?: string): {
  matched: boolean;
  score: number;
} {
  if (!targetLocation || targetLocation.trim().length === 0) {
    return { matched: true, score: 1.0 };
  }

  const query = targetLocation.toLowerCase().trim();
  const loc = restaurant.locality.toLowerCase();
  const addr = restaurant.address.toLowerCase();
  const city = restaurant.city.toLowerCase();

  if (loc === query || loc.includes(query) || query.includes(loc)) {
    return { matched: true, score: 1.0 };
  }
  if (addr.includes(query)) {
    return { matched: true, score: 0.85 };
  }
  if (city.includes(query) || query.includes('bangalore') || query.includes('bengaluru')) {
    return { matched: true, score: 0.6 };
  }

  return { matched: false, score: 0.0 };
}

/**
 * Core Hybrid Candidate Retrieval Engine
 */
export class CandidateRetrievalEngine {
  private restaurants: RestaurantRecord[];

  constructor(restaurants: RestaurantRecord[]) {
    this.restaurants = restaurants;
  }

  public retrieveCandidates(options: CandidateFilterOptions): RetrievalResult {
    const startTime = performance.now();
    const limit = options.limit ?? 20;
    const relaxedFactors: string[] = [];

    let activeMinRating = options.minRating;
    let activeMaxPrice = options.maxPrice;
    let activeLocation = options.location;

    // First attempt: Strict filtering
    let matched = this.filterAndScore(
      this.restaurants,
      options,
      activeLocation,
      activeMaxPrice,
      activeMinRating
    );

    // Dynamic relaxation fallback if query is too restrictive
    if (matched.length < 3 && options.allowRelaxation !== false) {
      // Step 1: Relax rating if specified
      if (activeMinRating && activeMinRating > 3.5) {
        activeMinRating = Math.max(3.0, activeMinRating - 0.5);
        relaxedFactors.push('Lowered minimum rating threshold');
        matched = this.filterAndScore(this.restaurants, options, activeLocation, activeMaxPrice, activeMinRating);
      }

      // Step 2: Relax price ceiling by 35% if still low
      if (matched.length < 3 && activeMaxPrice) {
        activeMaxPrice = Math.round(activeMaxPrice * 1.35);
        relaxedFactors.push('Expanded budget ceiling by 35%');
        matched = this.filterAndScore(this.restaurants, options, activeLocation, activeMaxPrice, activeMinRating);
      }

      // Step 3: Expand location if still low
      if (matched.length < 3 && activeLocation) {
        activeLocation = undefined;
        relaxedFactors.push('Broadened search across nearby localities in Bangalore');
        matched = this.filterAndScore(this.restaurants, options, activeLocation, activeMaxPrice, activeMinRating);
      }
    }

    // Sort by composite score descending
    matched.sort((a, b) => b.compositeScore - a.compositeScore);

    const topK = matched.slice(0, limit);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(3));

    return {
      candidates: topK,
      totalMatchesFound: matched.length,
      isRelaxed: relaxedFactors.length > 0,
      relaxedFactors,
      executionTimeMs
    };
  }

  private filterAndScore(
    records: RestaurantRecord[],
    options: CandidateFilterOptions,
    targetLocation?: string,
    targetMaxPrice?: number,
    targetMinRating?: number
  ): ScoredCandidate[] {
    const scored: ScoredCandidate[] = [];

    for (const r of records) {
      // 1. Location match
      const locMatch = checkLocationMatch(r, targetLocation);
      if (!locMatch.matched) continue;

      // 2. Rating threshold
      if (targetMinRating !== undefined && targetMinRating > 0) {
        if (r.rating === null || r.rating < targetMinRating) {
          continue;
        }
      }

      // 3. Price Category filter
      if (options.priceCategory && r.priceCategory !== options.priceCategory) {
        continue;
      }

      // 4. Hard budget filter (allow 10% soft buffer for candidate pool ranking)
      if (targetMaxPrice && targetMaxPrice > 0) {
        if (r.costForTwo > targetMaxPrice * 1.15) {
          continue;
        }
      }

      // 5. Booking requirement
      if (options.requireTableBooking && !r.hasTableBooking) {
        continue;
      }
      if (options.requireOnlineOrder && !r.hasOnlineOrder) {
        continue;
      }

      // 6. Keyword search (optional)
      if (options.searchKeyword) {
        const kw = options.searchKeyword.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(kw);
        const matchesDish = r.popularDishes.some((d) => d.toLowerCase().includes(kw));
        const matchesCuisine = r.cuisines.some((c) => c.toLowerCase().includes(kw));
        if (!matchesName && !matchesDish && !matchesCuisine) {
          continue;
        }
      }

      // 7. Cuisine match calculation
      const cuisineRes = calculateCuisineMatchScore(
        r.cuisines,
        r.popularDishes,
        options.cuisines || []
      );

      // If user specified cuisines, candidate must have positive relevance
      if (options.cuisines && options.cuisines.length > 0 && cuisineRes.score <= 0.05) {
        continue;
      }

      // Compute Individual Factor Scores
      const bayesRating = calculateBayesianRating(r.rating, r.votes);
      const budgetScore = calculateBudgetScore(r.costForTwo, targetMaxPrice);
      const popularityScore = calculatePopularityScore(r.votes);
      const normalizedRating = Math.min(1.0, bayesRating / 5.0);

      // Weighted Composite Formula (0 to 100)
      let weightedSum =
        0.35 * normalizedRating +
        0.30 * cuisineRes.score +
        0.20 * budgetScore +
        0.15 * popularityScore;

      // Location match multiplier
      weightedSum *= locMatch.score;

      // Small feature bonuses
      if (options.requireTableBooking && r.hasTableBooking) weightedSum += 0.03;
      if (r.popularDishes.length > 0) weightedSum += 0.02;

      const finalComposite = Math.min(100, Math.max(0, Math.round(weightedSum * 100)));

      scored.push({
        restaurant: r,
        compositeScore: finalComposite,
        bayesianRating: bayesRating,
        cuisineMatchScore: cuisineRes.score,
        budgetMatchScore: budgetScore,
        popularityScore,
        matchBreakdown: {
          locationMatch: locMatch.matched,
          cuisineOverlap: cuisineRes.overlappingCuisines,
          priceDifference: targetMaxPrice ? targetMaxPrice - r.costForTwo : 0
        }
      });
    }

    return scored;
  }
}

/**
 * Builds an ultra-compact, token-efficient JSON payload tailored for Gemini prompt injection
 */
export function buildLLMContextPayload(
  retrieval: RetrievalResult,
  options: CandidateFilterOptions
): LLMContextPayload {
  const queryParts: string[] = [];
  if (options.location) queryParts.push(`Location: ${options.location}`);
  if (options.cuisines?.length) queryParts.push(`Cuisines: ${options.cuisines.join(', ')}`);
  if (options.maxPrice) queryParts.push(`Max Budget: ₹${options.maxPrice}`);
  if (options.minRating) queryParts.push(`Min Rating: ${options.minRating}★`);
  if (options.requireTableBooking) queryParts.push('Table Booking: Required');

  const compactCandidates: CompressedLLMContextItem[] = retrieval.candidates.map((c) => {
    const r = c.restaurant;
    const topReview = r.reviews && r.reviews.length > 0 ? r.reviews[0].text : undefined;
    return {
      id: r.id,
      name: r.name,
      locality: r.locality,
      cuisines: r.cuisines.slice(0, 4),
      costForTwo: r.costForTwo,
      rating: r.rating ?? r.ratingString,
      votes: r.votes,
      types: r.restaurantType.slice(0, 2),
      dishes: r.popularDishes.slice(0, 5),
      tableBooking: r.hasTableBooking,
      sampleReview: topReview ? (topReview.length > 120 ? topReview.slice(0, 117) + '...' : topReview) : undefined
    };
  });

  return {
    userQuerySummary: queryParts.join(' | ') || 'General Bangalore Dining',
    candidateCount: compactCandidates.length,
    wasRelaxed: retrieval.isRelaxed,
    candidates: compactCandidates
  };
}
