/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cuisine Taxonomy, Related Concepts and Synonym Expander
 */

export const CUISINE_SYNONYMS: Record<string, string[]> = {
  'north indian': ['mughlai', 'punjabi', 'awadhi', 'kashmiri', 'tandoori', 'roti', 'dal makhani', 'paneer'],
  'south indian': ['kerala', 'andhra', 'chettinad', 'udupi', 'dosa', 'idli', 'mangalorean', 'tamil'],
  'chinese': ['asian', 'pan asian', 'noodles', 'dim sum', 'cantonese', 'szechuan', 'tibetan', 'momos'],
  'italian': ['pizza', 'pasta', 'continental', 'risotto', 'european'],
  'continental': ['european', 'italian', 'french', 'mediterranean', 'steaks'],
  'cafe': ['coffee', 'tea', 'bakery', 'desserts', 'fast food', 'sandwiches', 'beverages'],
  'fast food': ['burger', 'pizza', 'street food', 'snacks', 'rolls', 'wraps', 'sandwich'],
  'biryani': ['hyderabadi', 'mughlai', 'north indian', 'lucknowi'],
  'asian': ['chinese', 'thai', 'japanese', 'vietnamese', 'korean', 'malaysian', 'sushi', 'pan asian'],
  'desserts': ['ice cream', 'bakery', 'cakes', 'waffles', 'mithai', 'sweets'],
  'healthy food': ['salad', 'organic', 'juices', 'bowls', 'vegan', 'keto'],
  'bar & pub': ['finger food', 'pub', 'microbrewery', 'cocktails', 'brewery'],
  'seafood': ['coastal', 'mangalorean', 'goan', 'kerala', 'fish']
};

/**
 * Expands a cuisine query into all synonymous and related tags
 */
export function expandCuisineKeywords(cuisines: string[]): Set<string> {
  const expanded = new Set<string>();

  for (const raw of cuisines) {
    const term = raw.trim().toLowerCase();
    if (!term) continue;
    expanded.add(term);

    // Direct lookup
    if (CUISINE_SYNONYMS[term]) {
      for (const syn of CUISINE_SYNONYMS[term]) {
        expanded.add(syn);
      }
    }

    // Reverse lookup: check if this term appears as a synonym of another parent
    for (const [parent, syns] of Object.entries(CUISINE_SYNONYMS)) {
      if (syns.includes(term) || parent.includes(term)) {
        expanded.add(parent);
        for (const s of syns) expanded.add(s);
      }
    }
  }

  return expanded;
}

/**
 * Calculates a match score between a restaurant's cuisines and target cuisine terms
 * Returns a score between 0.0 and 1.0
 */
export function calculateCuisineMatchScore(
  restaurantCuisines: string[],
  restaurantDishes: string[],
  targetCuisines: string[]
): { score: number; overlappingCuisines: string[] } {
  if (!targetCuisines || targetCuisines.length === 0) {
    return { score: 1.0, overlappingCuisines: [] };
  }

  const targetExpanded = expandCuisineKeywords(targetCuisines);
  const matched = new Set<string>();

  // Check cuisines array
  for (const c of restaurantCuisines) {
    const cLower = c.toLowerCase();
    for (const target of targetExpanded) {
      if (cLower === target || cLower.includes(target) || target.includes(cLower)) {
        matched.add(c);
        break;
      }
    }
  }

  // Bonus for matching popular dishes
  let dishMatches = 0;
  for (const dish of restaurantDishes) {
    const dLower = dish.toLowerCase();
    for (const target of targetExpanded) {
      if (dLower.includes(target)) {
        dishMatches++;
        break;
      }
    }
  }

  const baseMatchRatio = matched.size > 0 ? Math.min(1.0, matched.size / Math.min(targetCuisines.length, 3)) : 0;
  const dishBonus = Math.min(0.25, dishMatches * 0.1);

  const finalScore = Math.min(1.0, baseMatchRatio + (baseMatchRatio > 0 ? dishBonus : 0));
  return {
    score: Number(finalScore.toFixed(3)),
    overlappingCuisines: Array.from(matched)
  };
}
