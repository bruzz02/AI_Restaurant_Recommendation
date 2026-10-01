/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: Prompt Engineering & System Instructions
 */

import type { UserLLMRequest } from './types.ts';
import type { LLMContextPayload } from '../phase2/types.ts';

export const SYSTEM_INSTRUCTION = `You are "SavorAI", an elite culinary concierge and restaurant critic specializing in the vibrant Bangalore dining scene.
Your mission is to analyze user dining preferences (budget, locality, rating, cuisines, occasion, dietary needs) against a curated set of retrieved candidate restaurants and deliver personalized, insightful recommendations.

CRITICAL GROUNDING RULES:
1. STRICTLY GROUNDED: You must ONLY recommend restaurants that appear in the provided Candidate List. NEVER fabricate or invent restaurants, IDs, dishes, or addresses.
2. PERSONALIZED RATIONALE: In "whyRecommended", explain specifically WHY this restaurant suits the user's explicit preferences (e.g. mention their budget match, location convenience, and how the cuisine aligns with their mood). Avoid generic platitudes like "good food".
3. SIGNATURE DISHES: Select 2-4 authentic must-try items directly from the candidate's popular dishes or reviews.
4. HONEST DINING TIPS: Give actionable, candid advice in "diningTip" (e.g., mention table reservations, best timing, parking/seating quirks, or portion sizes).
5. MATCH SCORE: Assign a realistic matchScore (between 70 and 99) reflecting how closely the restaurant aligns with all user requirements. Rank the best matches first.
6. CONCISE & READABLE: Keep explanations lively, crisp, and sophisticated.
`;

export function constructRecommendationPrompt(
  userRequest: UserLLMRequest,
  contextPayload: LLMContextPayload
): string {
  const preferencesList: string[] = [];
  if (userRequest.location) preferencesList.push(`• Preferred Locality: ${userRequest.location}`);
  if (userRequest.cuisines?.length) preferencesList.push(`• Cuisines: ${userRequest.cuisines.join(', ')}`);
  if (userRequest.maxPrice) preferencesList.push(`• Maximum Budget for Two: ₹${userRequest.maxPrice}`);
  if (userRequest.minRating) preferencesList.push(`• Minimum Rating: ${userRequest.minRating}★`);
  if (userRequest.priceCategory) preferencesList.push(`• Price Tier: ${userRequest.priceCategory}`);
  if (userRequest.vibeOrOccasion) preferencesList.push(`• Vibe / Occasion: "${userRequest.vibeOrOccasion}"`);
  if (userRequest.dietaryPreferences) preferencesList.push(`• Dietary Preferences: ${userRequest.dietaryPreferences}`);
  if (userRequest.mustHaveTableBooking) preferencesList.push(`• Must Have Table Booking: Yes`);
  if (userRequest.mustHaveOnlineOrder) preferencesList.push(`• Must Have Online Delivery: Yes`);
  if (userRequest.freeformPrompt) preferencesList.push(`• User Note / Context: "${userRequest.freeformPrompt}"`);

  const candidatesJson = JSON.stringify(contextPayload.candidates, null, 2);

  return `### USER DINING PREFERENCES:
${preferencesList.join('\n') || '• Open to all top Bangalore dining recommendations'}

${contextPayload.wasRelaxed ? 'Note: User criteria were strict, so nearby candidate boundaries were gently expanded.' : ''}

### RETRIEVED CANDIDATE RESTAURANTS (Total: ${contextPayload.candidateCount}):
\`\`\`json
${candidatesJson}
\`\`\`

### TASK:
Evaluate the candidate restaurants against the user's preferences.
Select the top 3 to 6 best matches from the candidates list.
Return the structured recommendation object adhering strictly to the JSON schema.`;
}
