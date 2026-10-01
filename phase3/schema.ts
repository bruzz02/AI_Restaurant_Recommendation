/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: Gemini Structured Output Schema
 */

import { Type } from '@google/genai';

export const recommendationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A 2-3 sentence overview of the user recommendations, highlighting common themes or tips.'
    },
    recommendations: {
      type: Type.ARRAY,
      description: 'Ordered list of top recommended restaurants from the provided candidates.',
      items: {
        type: Type.OBJECT,
        properties: {
          restaurantId: {
            type: Type.STRING,
            description: 'Exact ID of the candidate restaurant.'
          },
          restaurantName: {
            type: Type.STRING,
            description: 'Name of the restaurant.'
          },
          matchScore: {
            type: Type.NUMBER,
            description: 'Match percentage (integer between 0 and 100) reflecting how well it matches all criteria.'
          },
          whyRecommended: {
            type: Type.STRING,
            description: 'Compelling 2-3 sentence personalized rationale explaining why this venue fits the user preference.'
          },
          highlightedDishes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Must-try dishes specifically chosen from the popular dishes in the record.'
          },
          bestFor: {
            type: Type.STRING,
            description: 'Brief occasion tag (e.g. "Romantic Date Night", "Quick Family Lunch", "Late Night Cravings").'
          },
          priceVerdict: {
            type: Type.STRING,
            description: 'Concise value verdict (e.g. "Excellent Value under ₹800", "Moderate, high portions", "Splurge-worthy").'
          },
          diningTip: {
            type: Type.STRING,
            description: 'Practical dining tip based on reviews or booking status (e.g., "Reserve a table in advance on weekends").'
          }
        },
        required: [
          'restaurantId',
          'restaurantName',
          'matchScore',
          'whyRecommended',
          'highlightedDishes',
          'bestFor',
          'priceVerdict'
        ]
      }
    },
    alternativeSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '1-3 optional tips or alternative suggestions (e.g. adjacent neighborhoods or nearby cuisines to consider).'
    }
  },
  required: ['summary', 'recommendations']
};
