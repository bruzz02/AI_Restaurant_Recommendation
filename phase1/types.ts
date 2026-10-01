/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 1 Data Models & Contracts
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
  rating: number | null; // e.g. 4.2 or null if unrated
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

export interface DatasetSummary {
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
  ratingDistribution: Record<string, number>;
}

export interface MetadataIndices {
  locations: string[];
  cuisines: string[];
  priceCategories: string[];
  priceRanges: {
    min: number;
    max: number;
    average: number;
  };
}
