/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PriceCategory = 'budget' | 'moderate' | 'upscale' | 'luxury';

export interface ReviewSnippet {
  rating: number;
  text: string;
}

export interface RestaurantRecord {
  id: string;
  name: string;
  address: string;
  city: string;
  locality: string;
  cuisines: string[];
  costForTwo: number;
  priceCategory: PriceCategory;
  rating: number | null; // e.g. 4.2 or null if NEW / unrated
  ratingString: string;  // e.g. "4.2", "NEW", "Unrated"
  votes: number;
  restaurantType: string[];
  popularDishes: string[];
  hasOnlineOrder: boolean;
  hasTableBooking: boolean;
  reviews: ReviewSnippet[];
  url?: string;
  phone?: string;
}

export interface UserPreferences {
  location?: string;
  cuisines?: string[];
  maxPrice?: number;
  minRating?: number;
  priceCategory?: PriceCategory;
  dietaryOrAmbience?: string;
  mustHaveTableBooking?: boolean;
  mustHaveOnlineOrder?: boolean;
  searchQuery?: string;
}

export interface RecommendedRestaurant extends RestaurantRecord {
  matchScore: number; // 0 - 100
  whyRecommended: string;
  highlightedDishes: string[];
  bestFor: string;
  priceVerdict: string;
  diningTip?: string;
}

export interface RecommendationResponse {
  summary: string;
  recommendations: RecommendedRestaurant[];
  totalCandidatesEvaluated: number;
  appliedFilters: UserPreferences;
  alternativeSuggestions?: string[];
}

export interface IngestionMetadata {
  datasetSource: string;
  ingestedAt: string;
  totalRawRowsProcessed: number;
  totalUniqueRestaurants: number;
  locationsCount: number;
  topLocations: { name: string; count: number }[];
  cuisinesCount: number;
  topCuisines: { name: string; count: number }[];
  priceDistribution: Record<PriceCategory, number>;
  averageCostForTwo: number;
  averageRating: number;
  ratingDistribution: {
    '4.5+': number;
    '4.0 - 4.4': number;
    '3.5 - 3.9': number;
    '3.0 - 3.4': number;
    '< 3.0': number;
    'Unrated / New': number;
  };
}
