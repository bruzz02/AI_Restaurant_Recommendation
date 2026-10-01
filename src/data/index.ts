/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RestaurantRecord, IngestionMetadata } from '../types/restaurant.ts';

// Dynamic loaders / helpers for ingested dataset
export async function loadRestaurants(): Promise<RestaurantRecord[]> {
  try {
    const data = await import('./restaurants.json');
    return (data.default || data) as RestaurantRecord[];
  } catch (err) {
    console.error('Failed to load restaurants.json:', err);
    return [];
  }
}

export async function loadDatasetSummary(): Promise<IngestionMetadata | null> {
  try {
    const data = await import('./dataset_summary.json');
    return (data.default || data) as IngestionMetadata;
  } catch (err) {
    console.error('Failed to load dataset_summary.json:', err);
    return null;
  }
}

export async function loadMetadataIndices(): Promise<{
  locations: string[];
  cuisines: string[];
  priceCategories: string[];
  priceRanges: { min: number; max: number; average: number };
} | null> {
  try {
    const data = await import('./metadata_indices.json');
    return data.default || data;
  } catch (err) {
    console.error('Failed to load metadata_indices.json:', err);
    return null;
  }
}
