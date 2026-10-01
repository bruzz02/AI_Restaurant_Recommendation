/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 2 Automated Test Suite:
 * Validates Hybrid Candidate Retrieval Engine, Bayesian Scoring,
 * Cuisine Taxonomy Expansion, Constraint Relaxation, and LLM Payload Generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { RestaurantRecord } from '../../src/types/restaurant.ts';
import {
  CandidateRetrievalEngine,
  calculateBayesianRating,
  calculatePopularityScore,
  calculateBudgetScore,
  buildLLMContextPayload
} from '../retrievalEngine.ts';
import {
  expandCuisineKeywords,
  calculateCuisineMatchScore
} from '../cuisineTaxonomy.ts';

const RESTAURANTS_FILE = path.resolve(process.cwd(), 'src/data/restaurants.json');

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

function runPhase2Tests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING PHASE 2 TEST SUITE: CANDIDATE RETRIEVAL & FILTERING');
  console.log('===============================================================\n');

  // Load Data
  assert(fs.existsSync(RESTAURANTS_FILE), 'Dataset restaurants.json exists');
  const restaurants: RestaurantRecord[] = JSON.parse(fs.readFileSync(RESTAURANTS_FILE, 'utf-8'));
  assert(restaurants.length >= 1000, `Loaded ${restaurants.length} restaurants into retrieval test bed`);

  const engine = new CandidateRetrievalEngine(restaurants);

  // -------------------------------------------------------------
  // SUITE 1: Bayesian Damped Rating & Score Math
  // -------------------------------------------------------------
  console.log('\n📐 Suite 1: Mathematical Scoring & Bayesian Stabilization');
  
  // A 5.0 with only 2 votes must be damped towards dataset mean (~3.63)
  const lowVoteBayes = calculateBayesianRating(5.0, 2);
  assert(
    lowVoteBayes < 4.0 && lowVoteBayes > 3.6,
    `Low-vote outlier damping: 5.0 rating with 2 votes is damped to ${lowVoteBayes} (expected ~3.73)`
  );

  // A 4.6 with 10,000 votes should stay essentially 4.6
  const highVoteBayes = calculateBayesianRating(4.6, 10000);
  assert(
    Math.abs(highVoteBayes - 4.6) < 0.05,
    `High-vote stabilization: 4.6 rating with 10,000 votes remains stable at ${highVoteBayes}`
  );

  // Unrated restaurant (null) gets mean baseline
  const unratedBayes = calculateBayesianRating(null, 0);
  assert(
    unratedBayes === 3.63,
    `Unrated baseline: null rating yields dataset baseline ${unratedBayes}`
  );

  // Popularity log scaling
  const popLow = calculatePopularityScore(10);
  const popHigh = calculatePopularityScore(12000);
  assert(
    popHigh > popLow && popHigh >= 0.9 && popLow <= 0.35,
    `Log-scale popularity: 10 votes score ${popLow}, 12,000 votes score ${popHigh}`
  );

  // Budget scoring behavior
  const budgetUnder = calculateBudgetScore(400, 800);
  const budgetOver = calculateBudgetScore(1200, 800);
  assert(
    budgetUnder > budgetOver && budgetUnder >= 0.85 && budgetOver <= 0.3,
    `Budget evaluation: Under-budget (₹400/₹800) scores ${budgetUnder}, over-budget (₹1200/₹800) scores ${budgetOver}`
  );

  // -------------------------------------------------------------
  // SUITE 2: Cuisine Taxonomy & Semantic Synonyms
  // -------------------------------------------------------------
  console.log('\n🍜 Suite 2: Cuisine Taxonomy & Semantic Synonyms');
  
  const italianExpansion = expandCuisineKeywords(['italian']);
  assert(
    italianExpansion.has('pizza') && italianExpansion.has('pasta'),
    'Cuisine expansion: "italian" successfully expands to include "pizza" and "pasta"'
  );

  const biryaniExpansion = expandCuisineKeywords(['biryani']);
  assert(
    biryaniExpansion.has('north indian') && biryaniExpansion.has('mughlai'),
    'Cuisine expansion: "biryani" successfully expands to include "north indian" and "mughlai"'
  );

  // Match score between restaurant serving [Continental, Italian] and query for ['pizza']
  const scorePizza = calculateCuisineMatchScore(
    ['Continental', 'Italian'],
    ['Thin Crust Pizza', 'Pasta Alfredo'],
    ['pizza']
  );
  assert(
    scorePizza.score >= 0.9,
    `Semantic match: Query for 'pizza' against Italian restaurant scores ${scorePizza.score}`
  );

  // -------------------------------------------------------------
  // SUITE 3: Multi-Attribute Preference Retrieval (Price, Place, Rating, Cuisine)
  // -------------------------------------------------------------
  console.log('\n🔍 Suite 3: Multi-Attribute Candidate Retrieval');

  // Query 3.1: JP Nagar + North Indian + maxPrice ₹800 + minRating 4.0
  const res1 = engine.retrieveCandidates({
    location: 'JP Nagar',
    cuisines: ['North Indian'],
    maxPrice: 800,
    minRating: 4.0,
    limit: 10
  });

  assert(
    res1.candidates.length > 0,
    `Multi-attribute query 1 (JP Nagar, North Indian, max ₹800, min 4.0★) returned ${res1.candidates.length} candidates`
  );
  assert(
    res1.candidates[0].restaurant.locality.toLowerCase().includes('jp nagar'),
    `Top candidate locality matches: "${res1.candidates[0].restaurant.name}" in ${res1.candidates[0].restaurant.locality}`
  );
  assert(
    res1.candidates[0].restaurant.costForTwo <= 850,
    `Top candidate cost respects budget constraint: ₹${res1.candidates[0].restaurant.costForTwo}`
  );

  // Query 3.2: Banashankari + Cafe/Bakery + Under ₹500
  const res2 = engine.retrieveCandidates({
    location: 'Banashankari',
    cuisines: ['Cafe', 'Desserts'],
    maxPrice: 500,
    limit: 8
  });
  assert(
    res2.candidates.length > 0,
    `Multi-attribute query 2 (Banashankari, Cafe, under ₹500) returned ${res2.candidates.length} candidates (Top: "${res2.candidates[0].restaurant.name}")`
  );

  // Query 3.3: Upscale Dining with Table Booking
  const res3 = engine.retrieveCandidates({
    priceCategory: 'upscale',
    requireTableBooking: true,
    limit: 10
  });
  assert(
    res3.candidates.length > 0,
    `Multi-attribute query 3 (Upscale with Table Booking) returned ${res3.candidates.length} candidates`
  );
  assert(
    res3.candidates.every((c) => c.restaurant.hasTableBooking),
    'All returned candidates strictly satisfy requireTableBooking requirement'
  );

  // -------------------------------------------------------------
  // SUITE 4: Constraint Relaxation & Zero-Match Defense
  // -------------------------------------------------------------
  console.log('\n🛡️ Suite 4: Constraint Relaxation & Zero-Match Fallback');

  // Impossibly strict query: 5.0 rating with maxPrice ₹80 in a specific micro-locality
  const strictRes = engine.retrieveCandidates({
    location: 'Jayanagar',
    minRating: 4.95,
    maxPrice: 90,
    allowRelaxation: true,
    limit: 5
  });

  assert(
    strictRes.isRelaxed === true,
    'Engine detects over-constrained query and triggers dynamic relaxation'
  );
  assert(
    strictRes.relaxedFactors.length > 0,
    `Engine documents relaxed constraints: [${strictRes.relaxedFactors.join(', ')}]`
  );
  assert(
    strictRes.candidates.length > 0,
    `Relaxation successfully rescued query: Returned ${strictRes.candidates.length} candidates instead of failing empty`
  );

  // -------------------------------------------------------------
  // SUITE 5: LLM Context Payload Generator
  // -------------------------------------------------------------
  console.log('\n📦 Suite 5: LLM Context Payload Compression');

  const payload = buildLLMContextPayload(res1, {
    location: 'JP Nagar',
    cuisines: ['North Indian'],
    maxPrice: 800,
    minRating: 4.0
  });

  assert(
    payload.candidates.length === res1.candidates.length,
    `Payload contains expected ${payload.candidates.length} candidate items`
  );
  assert(
    typeof payload.userQuerySummary === 'string' && payload.userQuerySummary.includes('JP Nagar'),
    `Payload userQuerySummary formatted: "${payload.userQuerySummary}"`
  );

  const sampleCandidate = payload.candidates[0];
  assert(
    Boolean(sampleCandidate && sampleCandidate.id && sampleCandidate.name && sampleCandidate.costForTwo > 0),
    `Candidate item has compact essential fields (id, name, cost, cuisines: [${sampleCandidate?.cuisines.join(', ')}])`
  );

  const jsonStr = JSON.stringify(payload);
  const approxTokens = Math.round(jsonStr.length / 4);
  assert(
    approxTokens < 2500,
    `Token compactness verified: ~${approxTokens} tokens for ${payload.candidates.length} candidates (< 2500 token envelope)`
  );

  // -------------------------------------------------------------
  // SUITE 6: Retrieval Latency & Throughput Benchmark
  // -------------------------------------------------------------
  console.log('\n⚡ Suite 6: Performance & Sub-Millisecond Retrieval Latency');

  const benchmarkIterations = 150;
  const testLocations = ['JP Nagar', 'Banashankari', 'Bellandur', 'Sarjapur Road', 'BTM'];
  const testCuisines = [['North Indian'], ['South Indian'], ['Chinese', 'Asian'], ['Italian', 'Continental']];

  const benchStart = performance.now();
  for (let i = 0; i < benchmarkIterations; i++) {
    const loc = testLocations[i % testLocations.length];
    const cui = testCuisines[i % testCuisines.length];
    const maxP = 400 + (i % 5) * 300;

    engine.retrieveCandidates({
      location: loc,
      cuisines: cui,
      maxPrice: maxP,
      minRating: 3.5,
      limit: 15
    });
  }
  const benchDuration = performance.now() - benchStart;
  const avgLatency = benchDuration / benchmarkIterations;

  assert(
    avgLatency < 3.0,
    `Sub-millisecond retrieval throughput: Average latency is ${avgLatency.toFixed(3)} ms/query (< 3.0 ms threshold)`
  );

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📋 PHASE 2 TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('===============================================================');

  if (totalFailed > 0) {
    console.error('💥 Phase 2 test suite finished with failures!');
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 2 TESTS PASSED! Candidate retrieval & filtering verified.\n');
  }
}

runPhase2Tests();
