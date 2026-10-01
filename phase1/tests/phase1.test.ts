/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 1 Comprehensive Test Suite
 * Validates Phase 1 deliverables: data ingestion, normalization, schema constraints,
 * multi-attribute preference filtering (price, place, rating, cuisine), and query speed.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RestaurantRecord, DatasetSummary, MetadataIndices } from '../types.ts';
import {
  validateRestaurantRecord,
  validateDatasetSummary,
  validateMetadataIndices,
  VALID_PRICE_CATEGORIES
} from '../validator.ts';

const WORKSPACE_ROOT = path.resolve(process.cwd());
const RESTAURANTS_FILE = path.join(WORKSPACE_ROOT, 'src/data/restaurants.json');
const SUMMARY_FILE = path.join(WORKSPACE_ROOT, 'src/data/dataset_summary.json');
const INDICES_FILE = path.join(WORKSPACE_ROOT, 'src/data/metadata_indices.json');

// Test Runner Framework
let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    totalPassed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    totalFailed++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`     Details: ${failureDetails}`);
    }
  }
}

function runPhase1Tests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING PHASE 1 TEST SUITE: ZOMATO INGESTION & NORMALIZATION');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Files Existence & Loadability
  // -------------------------------------------------------------
  console.log('📂 Suite 1: File Existence & Basic Structure');
  assert(fs.existsSync(RESTAURANTS_FILE), 'restaurants.json exists');
  assert(fs.existsSync(SUMMARY_FILE), 'dataset_summary.json exists');
  assert(fs.existsSync(INDICES_FILE), 'metadata_indices.json exists');

  let restaurants: RestaurantRecord[] = [];
  let summary: DatasetSummary | null = null;
  let indices: MetadataIndices | null = null;

  try {
    restaurants = JSON.parse(fs.readFileSync(RESTAURANTS_FILE, 'utf-8'));
    assert(Array.isArray(restaurants) && restaurants.length >= 1000, `restaurants.json parsed with ${restaurants.length} records (>= 1000)`);
  } catch (err: any) {
    assert(false, 'restaurants.json parses as valid JSON', err.message);
  }

  try {
    summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'));
    assert(summary !== null && typeof summary === 'object', 'dataset_summary.json parsed as valid object');
  } catch (err: any) {
    assert(false, 'dataset_summary.json parses as valid JSON', err.message);
  }

  try {
    indices = JSON.parse(fs.readFileSync(INDICES_FILE, 'utf-8'));
    assert(indices !== null && Array.isArray(indices.locations), 'metadata_indices.json parsed with locations list');
  } catch (err: any) {
    assert(false, 'metadata_indices.json parses as valid JSON', err.message);
  }

  if (restaurants.length === 0 || !summary || !indices) {
    console.error('Fatal: Cannot continue tests without data.');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // SUITE 2: Schema Conformance & Boundary Constraints
  // -------------------------------------------------------------
  console.log('\n🛡️ Suite 2: Schema Conformance & Data Constraints');
  let invalidRecordsCount = 0;
  const sampleIssues: string[] = [];

  for (const record of restaurants) {
    const issues = validateRestaurantRecord(record);
    if (issues.length > 0) {
      invalidRecordsCount++;
      if (sampleIssues.length < 3) {
        sampleIssues.push(`${record.name || 'unnamed'}: ${issues.map((i) => i.issue).join(', ')}`);
      }
    }
  }

  assert(
    invalidRecordsCount === 0,
    `All ${restaurants.length} records pass strict schema validation`,
    sampleIssues.join(' | ')
  );

  const priceCategoryViolations = restaurants.filter((r) => !VALID_PRICE_CATEGORIES.has(r.priceCategory));
  assert(priceCategoryViolations.length === 0, 'Every restaurant has a valid priceCategory (budget, moderate, upscale, luxury)');

  const ratingBoundsViolations = restaurants.filter(
    (r) => r.rating !== null && (r.rating < 0.0 || r.rating > 5.0)
  );
  assert(ratingBoundsViolations.length === 0, 'All numerical ratings are within [0.0, 5.0]');

  const costViolations = restaurants.filter((r) => r.costForTwo <= 0 || isNaN(r.costForTwo));
  assert(costViolations.length === 0, 'All restaurants have positive integer costForTwo');

  // -------------------------------------------------------------
  // SUITE 3: Deduplication & Identifier Integrity
  // -------------------------------------------------------------
  console.log('\n🔑 Suite 3: Deduplication & Identifier Integrity');
  const idSet = new Set<string>();
  let duplicateIds = 0;

  const keySet = new Set<string>();
  let duplicateNamesInLocality = 0;

  for (const r of restaurants) {
    if (idSet.has(r.id)) duplicateIds++;
    idSet.add(r.id);

    const normKey = `${r.name.trim().toLowerCase()}||${r.locality.trim().toLowerCase()}`;
    if (keySet.has(normKey)) duplicateNamesInLocality++;
    keySet.add(normKey);
  }

  assert(duplicateIds === 0, `All ${restaurants.length} restaurant IDs are strictly unique`);
  assert(duplicateNamesInLocality === 0, 'No duplicate restaurant entries for same name + locality');

  // -------------------------------------------------------------
  // SUITE 4: Multi-Attribute Query Simulations (Price, Place, Rating, Cuisine)
  // -------------------------------------------------------------
  console.log('\n🔎 Suite 4: Multi-Attribute User Preference Queries');

  // Query 4.1: Budget South Indian in Banashankari with rating >= 3.8
  const q1 = restaurants.filter(
    (r) =>
      r.locality.toLowerCase().includes('banashankari') &&
      r.cuisines.some((c) => c.toLowerCase().includes('south indian')) &&
      r.costForTwo <= 500 &&
      r.rating !== null &&
      r.rating >= 3.8
  );
  assert(
    q1.length > 0,
    `Budget South Indian in Banashankari (found ${q1.length} restaurants, e.g. "${q1[0]?.name}", ₹${q1[0]?.costForTwo}, rating ${q1[0]?.rating})`
  );

  // Query 4.2: Upscale Continental / Italian with Table Booking
  const q2 = restaurants.filter(
    (r) =>
      (r.priceCategory === 'upscale' || r.priceCategory === 'luxury' || r.costForTwo >= 1200) &&
      r.cuisines.some((c) => c.toLowerCase().includes('continental') || c.toLowerCase().includes('italian')) &&
      r.hasTableBooking
  );
  assert(
    q2.length > 0,
    `Upscale Continental/Italian with Table Booking (found ${q2.length} restaurants, e.g. "${q2[0]?.name}", ₹${q2[0]?.costForTwo})`
  );

  // Query 4.3: High-Rated Casual Dining in JP Nagar
  const q3 = restaurants.filter(
    (r) =>
      r.locality.toLowerCase().includes('jp nagar') &&
      r.restaurantType.some((t) => t.toLowerCase().includes('casual dining')) &&
      r.rating !== null &&
      r.rating >= 4.0
  );
  assert(
    q3.length > 0,
    `High-rated (>=4.0) Casual Dining in JP Nagar (found ${q3.length} restaurants, e.g. "${q3[0]?.name}", ${q3[0]?.rating}★)`
  );

  // Query 4.4: Street Food / Fast Food under ₹250
  const q4 = restaurants.filter(
    (r) =>
      r.costForTwo <= 250 &&
      r.cuisines.some((c) => c.toLowerCase().includes('fast food') || c.toLowerCase().includes('street food') || c.toLowerCase().includes('beverages'))
  );
  assert(
    q4.length > 0,
    `Quick Budget Snacks under ₹250 (found ${q4.length} restaurants, e.g. "${q4[0]?.name}", ₹${q4[0]?.costForTwo})`
  );

  // -------------------------------------------------------------
  // SUITE 5: Dataset Summary & Indices Validation
  // -------------------------------------------------------------
  console.log('\n📊 Suite 5: Summary Statistics & Metadata Consistency');
  const summaryErrors = validateDatasetSummary(summary);
  assert(summaryErrors.length === 0, 'Dataset summary conforms to schema');

  const indicesErrors = validateMetadataIndices(indices);
  assert(indicesErrors.length === 0, 'Metadata indices conform to schema');

  const sumCategories =
    summary.priceDistribution.budget +
    summary.priceDistribution.moderate +
    summary.priceDistribution.upscale +
    summary.priceDistribution.luxury;
  assert(
    sumCategories === restaurants.length,
    `Price distribution counts (${sumCategories}) match total restaurants (${restaurants.length})`
  );

  assert(
    indices.locations.length >= 20,
    `Metadata indices provide broad locality coverage (${indices.locations.length} top localities available)`
  );

  assert(
    indices.cuisines.length >= 30,
    `Metadata indices provide broad cuisine coverage (${indices.cuisines.length} top cuisines available)`
  );

  // -------------------------------------------------------------
  // SUITE 6: In-Memory Search Latency Benchmark
  // -------------------------------------------------------------
  console.log('\n⚡ Suite 6: Performance & In-Memory Retrieval Latency');
  const benchmarkIterations = 100;
  const sampleLocalities = ['JP Nagar', 'Banashankari', 'Bellandur', 'Sarjapur Road', 'BTM'];
  const sampleCuisines = ['North Indian', 'Chinese', 'South Indian', 'Continental', 'Biryani'];

  const startTime = performance.now();
  for (let i = 0; i < benchmarkIterations; i++) {
    const loc = sampleLocalities[i % sampleLocalities.length];
    const cui = sampleCuisines[i % sampleCuisines.length];
    const maxCost = 400 + (i % 6) * 200;

    // Simulate multi-attribute query filter
    const _matches = restaurants.filter(
      (r) =>
        r.locality.toLowerCase().includes(loc.toLowerCase()) &&
        r.cuisines.some((c) => c.toLowerCase().includes(cui.toLowerCase())) &&
        r.costForTwo <= maxCost
    );
  }
  const totalDuration = performance.now() - startTime;
  const avgQueryLatencyMs = totalDuration / benchmarkIterations;

  assert(
    avgQueryLatencyMs < 5.0,
    `In-memory query throughput: Average latency is ${avgQueryLatencyMs.toFixed(3)} ms/query (< 5.0 ms threshold)`
  );

  // -------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📋 PHASE 1 TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('===============================================================');

  if (totalFailed > 0) {
    console.error('💥 Test suite finished with failures!');
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 1 TESTS PASSED! Data ingestion & normalization is solid.\n');
  }
}

runPhase1Tests();
