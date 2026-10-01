/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: Full Recommendation Orchestrator
 * Integrates Phase 2 Candidate Retrieval with Phase 3 LLM Reasoning.
 */

import type { RestaurantRecord } from '../src/types/restaurant.ts';
import type {
  UserLLMRequest,
  RecommendationServiceResult,
  FinalRecommendationRecord
} from './types.ts';
import { CandidateRetrievalEngine, buildLLMContextPayload } from '../phase2/retrievalEngine.ts';
import { generateRecommendationsWithLLM } from './llmService.ts';

export class RecommendationOrchestrator {
  private retrievalEngine: CandidateRetrievalEngine;
  private restaurantMap: Map<string, RestaurantRecord>;

  constructor(restaurants: RestaurantRecord[]) {
    this.retrievalEngine = new CandidateRetrievalEngine(restaurants);
    this.restaurantMap = new Map();
    for (const r of restaurants) {
      this.restaurantMap.set(r.id, r);
    }
  }

  public async getRecommendations(request: UserLLMRequest): Promise<RecommendationServiceResult> {
    const overallStart = performance.now();

    // 1. Phase 2 Candidate Retrieval
    const retrievalResult = this.retrievalEngine.retrieveCandidates({
      location: request.location,
      cuisines: request.cuisines,
      maxPrice: request.maxPrice,
      minRating: request.minRating,
      priceCategory: request.priceCategory,
      requireTableBooking: request.mustHaveTableBooking,
      requireOnlineOrder: request.mustHaveOnlineOrder,
      limit: 15,
      allowRelaxation: true
    });

    // 2. Token-efficient Context Payload
    const contextPayload = buildLLMContextPayload(retrievalResult, {
      location: request.location,
      cuisines: request.cuisines,
      maxPrice: request.maxPrice,
      minRating: request.minRating,
      priceCategory: request.priceCategory,
      requireTableBooking: request.mustHaveTableBooking,
      requireOnlineOrder: request.mustHaveOnlineOrder
    });

    // 3. Phase 3 LLM Reasoning / Fallback Synthesis
    const llmResult = await generateRecommendationsWithLLM(
      request,
      contextPayload,
      retrievalResult.candidates
    );

    // 4. Merge Reasoning with Base Restaurant Records
    const finalRecords: FinalRecommendationRecord[] = [];
    const usedIds = new Set<string>();

    for (const rec of llmResult.output.recommendations) {
      const base = this.restaurantMap.get(rec.restaurantId);
      if (base) {
        usedIds.add(base.id);
        finalRecords.push({
          ...base,
          matchScore: rec.matchScore,
          whyRecommended: rec.whyRecommended,
          highlightedDishes: rec.highlightedDishes.length > 0 ? rec.highlightedDishes : base.popularDishes.slice(0, 3),
          bestFor: rec.bestFor,
          priceVerdict: rec.priceVerdict,
          diningTip: rec.diningTip,
          source: llmResult.source
        });
      }
    }

    // Safety fallback: If LLM returned IDs not found in map, backfill from top retrieval candidates
    if (finalRecords.length === 0 && retrievalResult.candidates.length > 0) {
      for (const c of retrievalResult.candidates.slice(0, 5)) {
        if (!usedIds.has(c.restaurant.id)) {
          finalRecords.push({
            ...c.restaurant,
            matchScore: c.compositeScore,
            whyRecommended: `Top candidate in ${c.restaurant.locality} holding a ${c.restaurant.rating}★ rating.`,
            highlightedDishes: c.restaurant.popularDishes.slice(0, 3),
            bestFor: 'Casual Dining',
            priceVerdict: `₹${c.restaurant.costForTwo} for two`,
            source: llmResult.source
          });
        }
      }
    }

    const totalDuration = Number((performance.now() - overallStart).toFixed(2));

    return {
      summary: llmResult.output.summary,
      recommendations: finalRecords,
      totalCandidatesEvaluated: retrievalResult.totalMatchesFound,
      wasRelaxed: retrievalResult.isRelaxed,
      relaxedFactors: retrievalResult.relaxedFactors,
      source: llmResult.source,
      executionTimeMs: totalDuration,
      alternativeSuggestions: llmResult.output.alternativeSuggestions
    };
  }
}
