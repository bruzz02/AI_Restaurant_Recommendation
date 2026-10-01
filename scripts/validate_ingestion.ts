/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 1 Ingestion Validation Suite
 * Validates schema conformance, data boundaries, and queryability of ingested Zomato dataset.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RestaurantRecord, IngestionMetadata } from '../src/types/restaurant.ts';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const RESTAURANTS_PATH = path.join(DATA_DIR, 'restaurants.json');
const SUMMARY_PATH = path.join(DATA_DIR, 'dataset_summary.json');
const INDICES_PATH = path.join(DATA_DIR, 'metadata_indices.json');

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

function runValidation() {
  console.log('====================================================');
  console.log('🔍 PHASE 1 INGESTION VALIDATION SUITE');
  console.log('====================================================\n');

  const results: ValidationResult[] = [];

  // Check 1: File Existence
  for (const [name, filepath] of Object.entries({
    'restaurants.json': RESTAURANTS_PATH,
    'dataset_summary.json': SUMMARY_PATH,
    'metadata_indices.json': INDICES_PATH
  })) {
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      results.push({
        passed: true,
        message: `File check: ${name} exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`
      });
    } else {
      results.push({
        passed: false,
        message: `File check: ${name} is missing at ${filepath}`
      });
    }
  }

  // Check 2: Load and validate restaurants.json
  const rawRestaurants = fs.readFileSync(RESTAURANTS_PATH, 'utf-8');
  const restaurants: RestaurantRecord[] = JSON.parse(rawRestaurants);

  if (Array.isArray(restaurants) && restaurants.length >= 1000) {
    results.push({
      passed: true,
      message: `Record volume: Loaded ${restaurants.length} normalized restaurants (Target: >= 1000)`
    });
  } else {
    results.push({
      passed: false,
      message: `Record volume: Insufficient records (${restaurants?.length || 0})`
    });
  }

  // Check 3: Schema & Constraint Verification
  let schemaErrors = 0;
  let invalidRatings = 0;
  let invalidCosts = 0;
  let emptyNamesOrLocations = 0;
  const validPriceCats = new Set(['budget', 'moderate', 'upscale', 'luxury']);

  for (const r of restaurants) {
    if (!r.id || !r.name || !r.locality) {
      emptyNamesOrLocations++;
    }
    if (!validPriceCats.has(r.priceCategory)) {
      schemaErrors++;
    }
    if (r.costForTwo <= 0 || isNaN(r.costForTwo)) {
      invalidCosts++;
    }
    if (r.rating !== null && (r.rating < 0 || r.rating > 5.0 || isNaN(r.rating))) {
      invalidRatings++;
    }
  }

  results.push({
    passed: emptyNamesOrLocations === 0,
    message: `Integrity: Identifiers, names, and localities populated (${emptyNamesOrLocations} invalid)`
  });

  results.push({
    passed: invalidRatings === 0,
    message: `Constraint: Rating bounds [0.0 - 5.0] or null strictly maintained (${invalidRatings} invalid)`
  });

  results.push({
    passed: invalidCosts === 0,
    message: `Constraint: Positive cost-for-two values verified (${invalidCosts} invalid)`
  });

  results.push({
    passed: schemaErrors === 0,
    message: `Categorization: Price categories strictly match [budget, moderate, upscale, luxury] (${schemaErrors} invalid)`
  });

  // Check 4: Queryability Test (Price, Place, Rating, Cuisine)
  const testQueries = [
    {
      name: 'North Indian in JP Nagar under ₹800 with Rating >= 4.0',
      fn: (r: RestaurantRecord) =>
        r.locality.toLowerCase().includes('jp nagar') &&
        r.cuisines.some((c) => c.toLowerCase().includes('north indian')) &&
        r.costForTwo <= 800 &&
        (r.rating !== null && r.rating >= 4.0)
    },
    {
      name: 'Cafe or Italian in Banashankari with Table Booking',
      fn: (r: RestaurantRecord) =>
        r.locality.toLowerCase().includes('banashankari') &&
        (r.cuisines.some((c) => c.toLowerCase().includes('italian') || c.toLowerCase().includes('cafe')) ||
         r.restaurantType.some((t) => t.toLowerCase().includes('cafe'))) &&
        r.hasTableBooking
    },
    {
      name: 'Budget Biryani or South Indian under ₹400',
      fn: (r: RestaurantRecord) =>
        r.priceCategory === 'budget' &&
        r.costForTwo <= 400 &&
        r.cuisines.some((c) => c.toLowerCase().includes('biryani') || c.toLowerCase().includes('south indian'))
    }
  ];

  for (const q of testQueries) {
    const matches = restaurants.filter(q.fn);
    results.push({
      passed: matches.length > 0,
      message: `Query Test [${q.name}]: Found ${matches.length} matching candidates (Top: "${matches[0]?.name || 'None'}", Rating: ${matches[0]?.rating ?? 'N/A'}, Cost: ₹${matches[0]?.costForTwo ?? 'N/A'})`
    });
  }

  // Print Summary Table
  let allPassed = true;
  for (const res of results) {
    const icon = res.passed ? '✅' : '❌';
    console.log(`${icon}  ${res.message}`);
    if (!res.passed) allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 PHASE 1 VALIDATION PASSED: Ingestion & normalization verified!');
  } else {
    console.error('💥 PHASE 1 VALIDATION FAILED: Review the errors above.');
    process.exit(1);
  }
  console.log('====================================================\n');
}

runValidation();
