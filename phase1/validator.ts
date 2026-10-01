/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 1 Data Validator
 */

import type { RestaurantRecord, DatasetSummary, MetadataIndices, PriceCategory } from './types.ts';

export const VALID_PRICE_CATEGORIES: Set<PriceCategory> = new Set([
  'budget',
  'moderate',
  'upscale',
  'luxury'
]);

export interface ValidationIssue {
  recordId?: string;
  field: string;
  issue: string;
}

export function validateRestaurantRecord(r: RestaurantRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!r.id || typeof r.id !== 'string') {
    issues.push({ recordId: r.id, field: 'id', issue: 'Missing or non-string id' });
  }
  if (!r.name || typeof r.name !== 'string' || r.name.trim().length === 0) {
    issues.push({ recordId: r.id, field: 'name', issue: 'Missing or empty restaurant name' });
  }
  if (!r.locality || typeof r.locality !== 'string' || r.locality.trim().length === 0) {
    issues.push({ recordId: r.id, field: 'locality', issue: 'Missing or empty locality' });
  }
  if (typeof r.costForTwo !== 'number' || isNaN(r.costForTwo) || r.costForTwo <= 0) {
    issues.push({ recordId: r.id, field: 'costForTwo', issue: `Invalid costForTwo: ${r.costForTwo}` });
  }
  if (!VALID_PRICE_CATEGORIES.has(r.priceCategory)) {
    issues.push({ recordId: r.id, field: 'priceCategory', issue: `Invalid priceCategory: ${r.priceCategory}` });
  }
  if (r.rating !== null && (typeof r.rating !== 'number' || isNaN(r.rating) || r.rating < 0 || r.rating > 5.0)) {
    issues.push({ recordId: r.id, field: 'rating', issue: `Rating out of bounds: ${r.rating}` });
  }
  if (!Array.isArray(r.cuisines)) {
    issues.push({ recordId: r.id, field: 'cuisines', issue: 'cuisines is not an array' });
  }
  if (!Array.isArray(r.popularDishes)) {
    issues.push({ recordId: r.id, field: 'popularDishes', issue: 'popularDishes is not an array' });
  }
  if (!Array.isArray(r.reviews)) {
    issues.push({ recordId: r.id, field: 'reviews', issue: 'reviews is not an array' });
  } else {
    for (const rev of r.reviews) {
      if (typeof rev.rating !== 'number' || !rev.text) {
        issues.push({ recordId: r.id, field: 'reviews', issue: 'Review item missing valid rating or text' });
        break;
      }
    }
  }

  return issues;
}

export function validateDatasetSummary(summary: DatasetSummary): string[] {
  const errors: string[] = [];
  if (!summary.datasetSource) errors.push('Missing datasetSource');
  if (summary.totalUniqueRestaurants <= 0) errors.push('Invalid totalUniqueRestaurants');
  if (summary.locationsCount <= 0) errors.push('Invalid locationsCount');
  if (summary.cuisinesCount <= 0) errors.push('Invalid cuisinesCount');
  if (!summary.priceDistribution) errors.push('Missing priceDistribution');
  if (typeof summary.averageRating !== 'number' || summary.averageRating < 0 || summary.averageRating > 5) {
    errors.push('averageRating invalid');
  }
  return errors;
}

export function validateMetadataIndices(indices: MetadataIndices): string[] {
  const errors: string[] = [];
  if (!Array.isArray(indices.locations) || indices.locations.length === 0) {
    errors.push('locations array empty or missing');
  }
  if (!Array.isArray(indices.cuisines) || indices.cuisines.length === 0) {
    errors.push('cuisines array empty or missing');
  }
  if (!indices.priceRanges || indices.priceRanges.min <= 0 || indices.priceRanges.max <= 0) {
    errors.push('priceRanges invalid');
  }
  return errors;
}
