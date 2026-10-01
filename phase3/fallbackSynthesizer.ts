/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: Rule-Based Fallback Synthesizer
 * Provides high-quality, structured recommendations when LLM API key is absent or offline.
 */

import type { UserLLMRequest, LLMSynthesisOutput, LLMRecommendationItem } from './types.ts';
import type { ScoredCandidate } from '../phase2/types.ts';

export function synthesizeFallbackRecommendations(
  userRequest: UserLLMRequest,
  candidates: ScoredCandidate[],
  limit: number = 5
): LLMSynthesisOutput {
  const topCandidates = candidates.slice(0, limit);

  const loc = userRequest.location || 'Bangalore';
  const cuisinesStr = userRequest.cuisines?.length ? userRequest.cuisines.join(' & ') : 'diverse';

  const summary = `Found ${candidates.length} strong candidates in ${loc} serving ${cuisinesStr} cuisine. Here are the top vetted dining spots matched against your budget, rating, and dining preferences.`;

  const recommendations: LLMRecommendationItem[] = topCandidates.map((c, index) => {
    const r = c.restaurant;
    const dishes = r.popularDishes.length > 0
      ? r.popularDishes.slice(0, 4)
      : (r.cuisines.length > 0 ? r.cuisines.slice(0, 3) : ['House Special']);

    // Generate tailored rationale
    let why = `A celebrated ${r.locality} staple holding a ${r.rating ? `${r.rating}★ rating` : 'strong local reputation'}. `;
    if (userRequest.maxPrice && r.costForTwo <= userRequest.maxPrice) {
      why += `At ₹${r.costForTwo} for two, it fits comfortably within your ₹${userRequest.maxPrice} target. `;
    } else {
      why += `Priced around ₹${r.costForTwo} for two for an authentic dining experience. `;
    }

    if (r.reviews.length > 0) {
      why += `Known for highlights like "${r.reviews[0].text.slice(0, 90)}..."`;
    } else {
      why += `Popular for fresh preparations of ${r.cuisines.slice(0, 2).join(' and ')}.`;
    }

    // Occasion tag
    let bestFor = 'Casual Dining & Weekend Meals';
    if (r.priceCategory === 'upscale' || r.priceCategory === 'luxury') {
      bestFor = 'Celebrations & Fine Dining';
    } else if (r.priceCategory === 'budget') {
      bestFor = 'Quick Bites & Everyday Hangouts';
    } else if (r.restaurantType.some((t) => t.toLowerCase().includes('cafe'))) {
      bestFor = 'Coffee Dates & Work Sessions';
    }

    // Value verdict
    let priceVerdict = `Solid value at ₹${r.costForTwo} for two`;
    if (userRequest.maxPrice && r.costForTwo < userRequest.maxPrice * 0.7) {
      priceVerdict = `Incredible budget saver (under ₹${userRequest.maxPrice})`;
    } else if (r.costForTwo > 1500) {
      priceVerdict = `Premium experience worth the price`;
    }

    // Dining tip
    let tip = r.hasTableBooking
      ? 'Table booking is available; recommended for peak weekend dinners.'
      : 'Walk-ins only; visit slightly before peak hours to avoid wait times.';
    if (r.hasOnlineOrder) {
      tip += ' Also offers prompt delivery.';
    }

    return {
      restaurantId: r.id,
      restaurantName: r.name,
      matchScore: Math.min(98, Math.max(75, Math.round(c.compositeScore - index * 2))),
      whyRecommended: why,
      highlightedDishes: dishes,
      bestFor,
      priceVerdict,
      diningTip: tip
    };
  });

  const alternativeSuggestions = [
    `Explore adjacent micro-markets near ${loc} for hidden culinary gems.`,
    userRequest.maxPrice ? `Expanding your budget ceiling by 20% unlocks additional fine-dining selections.` : 'Check seasonal specials during weekday lunches.'
  ];

  return {
    summary,
    recommendations,
    alternativeSuggestions
  };
}
