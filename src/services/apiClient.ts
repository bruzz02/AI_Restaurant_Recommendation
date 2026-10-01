/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Client-Side API Helper for Phase 4 REST Endpoints
 */

import type {
  HealthApiResponse,
  FilterMetaApiResponse,
  PaginatedRestaurantsResponse,
  RecommendApiRequestBody,
  RecommendApiResponse,
  AnalyticsInsightsResponse,
  RestaurantQueryFilters
} from '../../phase4/types.ts';
import type { RestaurantRecord } from '../types/restaurant.ts';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthApiResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchFilterMeta(): Promise<FilterMetaApiResponse> {
  const res = await fetch(`${API_BASE}/meta/filters`);
  if (!res.ok) throw new Error(`Failed to load filter metadata: ${res.statusText}`);
  return res.json();
}

export async function fetchRestaurants(filters: RestaurantQueryFilters = {}): Promise<PaginatedRestaurantsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.search) params.set('search', filters.search);
  if (filters.locality) params.set('locality', filters.locality);
  if (filters.cuisine) params.set('cuisine', filters.cuisine);
  if (filters.priceCategory) params.set('priceCategory', filters.priceCategory);
  if (filters.minRating) params.set('minRating', filters.minRating.toString());
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
  if (filters.hasTableBooking) params.set('hasTableBooking', 'true');
  if (filters.hasOnlineOrder) params.set('hasOnlineOrder', 'true');
  if (filters.sortBy) params.set('sortBy', filters.sortBy);

  const res = await fetch(`${API_BASE}/restaurants?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch restaurants: ${res.statusText}`);
  return res.json();
}

export async function fetchRestaurantById(id: string): Promise<RestaurantRecord> {
  const res = await fetch(`${API_BASE}/restaurants/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Restaurant ${id} not found`);
  return res.json();
}

export async function getRecommendations(body: RecommendApiRequestBody): Promise<RecommendApiResponse> {
  const res = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Recommendation request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsInsightsResponse> {
  const res = await fetch(`${API_BASE}/analytics/insights`);
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
  return res.json();
}
