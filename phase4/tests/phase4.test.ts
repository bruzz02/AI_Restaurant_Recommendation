/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4 Automated Test Suite:
 * Validates REST API endpoints, pagination, filtering, single restaurant lookup,
 * recommendation orchestration, in-memory caching, and analytics insights.
 */

import * as http from 'http';
import { createServerApp } from '../serverApp.ts';
import type {
  HealthApiResponse,
  FilterMetaApiResponse,
  PaginatedRestaurantsResponse,
  RecommendApiResponse,
  AnalyticsInsightsResponse
} from '../types.ts';

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

async function runPhase4Tests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING PHASE 4 TEST SUITE: BACKEND REST API & SERVICE LAYER');
  console.log('===============================================================\n');

  // Start ephemeral HTTP server
  const app = createServerApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number; address: string };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`📡 Test server running at ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // SUITE 1: GET /api/health
    // -------------------------------------------------------------
    console.log('🏥 Suite 1: Healthcheck API (GET /api/health)');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'Healthcheck returns HTTP 200');

    const healthData = (await healthRes.json()) as HealthApiResponse;
    assert(healthData.status === 'ok', `Health status is "${healthData.status}"`);
    assert(healthData.totalRestaurants >= 1000, `Total restaurants in health report: ${healthData.totalRestaurants}`);
    assert(typeof healthData.memoryUsageMb === 'number', `Memory usage reported: ${healthData.memoryUsageMb} MB`);

    // -------------------------------------------------------------
    // SUITE 2: GET /api/meta/filters
    // -------------------------------------------------------------
    console.log('\n🗂️ Suite 2: Filter Metadata API (GET /api/meta/filters)');
    const metaRes = await fetch(`${baseUrl}/api/meta/filters`);
    assert(metaRes.status === 200, 'Meta filters returns HTTP 200');

    const metaData = (await metaRes.json()) as FilterMetaApiResponse;
    assert(Array.isArray(metaData.locations) && metaData.locations.length >= 20, `Provides ${metaData.locations.length} top locations`);
    assert(Array.isArray(metaData.cuisines) && metaData.cuisines.length >= 30, `Provides ${metaData.cuisines.length} top cuisines`);
    assert(metaData.priceCategories.length === 4, 'Includes 4 price tiers [budget, moderate, upscale, luxury]');
    assert(metaData.priceBounds.average > 0, `Average price calculated: ₹${metaData.priceBounds.average}`);

    // -------------------------------------------------------------
    // SUITE 3: GET /api/restaurants (Pagination, Search & Filtering)
    // -------------------------------------------------------------
    console.log('\n🍽️ Suite 3: Restaurants Query API (GET /api/restaurants)');
    
    // 3.1: Default pagination
    const listRes = await fetch(`${baseUrl}/api/restaurants?page=1&limit=15`);
    assert(listRes.status === 200, 'Restaurants listing returns HTTP 200');
    const listData = (await listRes.json()) as PaginatedRestaurantsResponse;
    assert(listData.restaurants.length === 15, `Pagination limit respected: returned ${listData.restaurants.length} items`);
    assert(listData.totalMatches >= 1000, `Total matches reported: ${listData.totalMatches}`);
    assert(listData.totalPages > 1, `Total pages calculated: ${listData.totalPages}`);

    // 3.2: Filter by locality & cuisine
    const filteredRes = await fetch(`${baseUrl}/api/restaurants?locality=banashankari&cuisine=south indian&maxPrice=300`);
    assert(filteredRes.status === 200, 'Filtered query returns HTTP 200');
    const filteredData = (await filteredRes.json()) as PaginatedRestaurantsResponse;
    assert(filteredData.totalMatches > 0, `Locality + Cuisine filter returned ${filteredData.totalMatches} matches`);
    assert(
      filteredData.restaurants.every((r) => r.locality.toLowerCase().includes('banashankari') && r.costForTwo <= 300),
      'All returned restaurants strictly satisfy locality and maxPrice constraints'
    );

    // 3.3: Sorting by cost ascending
    const sortRes = await fetch(`${baseUrl}/api/restaurants?limit=5&sortBy=cost_asc`);
    const sortData = (await sortRes.json()) as PaginatedRestaurantsResponse;
    const costs = sortData.restaurants.map((r) => r.costForTwo);
    const isSortedAsc = costs.every((c, i) => i === 0 || c >= costs[i - 1]);
    assert(isSortedAsc, `Sort by cost_asc verified: [${costs.join(', ')}]`);

    // -------------------------------------------------------------
    // SUITE 4: GET /api/restaurants/:id
    // -------------------------------------------------------------
    console.log('\n🔎 Suite 4: Single Restaurant Lookup (GET /api/restaurants/:id)');
    const sampleId = listData.restaurants[0].id;
    const detailRes = await fetch(`${baseUrl}/api/restaurants/${sampleId}`);
    assert(detailRes.status === 200, `Valid restaurant ID returns HTTP 200`);
    const detailData = await detailRes.json();
    assert(detailData.id === sampleId, `Retrieved exact restaurant: "${detailData.name}"`);

    const notFoundRes = await fetch(`${baseUrl}/api/restaurants/non-existent-fake-id-9999`);
    assert(notFoundRes.status === 404, 'Invalid restaurant ID correctly returns HTTP 404');

    // -------------------------------------------------------------
    // SUITE 5: POST /api/recommend (Recommendation Pipeline)
    // -------------------------------------------------------------
    console.log('\n🤖 Suite 5: Recommendation Endpoint (POST /api/recommend)');
    const reqBody = {
      location: 'Bellandur',
      cuisines: ['North Indian', 'Biryani'],
      maxPrice: 900,
      minRating: 3.8,
      vibeOrOccasion: 'Team Lunch'
    };

    const recRes = await fetch(`${baseUrl}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });

    assert(recRes.status === 200, 'Recommendation endpoint returns HTTP 200');
    const recData = (await recRes.json()) as RecommendApiResponse;
    assert(recData.success === true, 'Recommendation response reports success: true');
    assert(recData.recommendations.length > 0, `Returned ${recData.recommendations.length} vetted recommendations`);
    assert(typeof recData.summary === 'string' && recData.summary.length > 0, 'Recommendation contains narrative summary');
    assert(recData.cached === false, 'First request correctly indicates cached: false');

    const topPick = recData.recommendations[0];
    assert(
      topPick.matchScore >= 70 && topPick.matchScore <= 100,
      `Top pick has valid matchScore: ${topPick.matchScore}`
    );
    assert(
      typeof topPick.whyRecommended === 'string' && topPick.whyRecommended.length > 15,
      `Top pick has personalized rationale: "${topPick.whyRecommended.slice(0, 60)}..."`
    );

    // -------------------------------------------------------------
    // SUITE 6: In-Memory Caching Verification
    // -------------------------------------------------------------
    console.log('\n⚡ Suite 6: Query Cache Performance');
    const cacheStart = performance.now();
    const cachedRes = await fetch(`${baseUrl}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const cacheLatency = performance.now() - cacheStart;

    assert(cachedRes.status === 200, 'Cached request returns HTTP 200');
    const cachedData = (await cachedRes.json()) as RecommendApiResponse;
    assert(cachedData.cached === true, 'Second identical request reports cached: true');
    assert(cacheLatency < 25, `Cache retrieval latency: ${cacheLatency.toFixed(2)} ms (< 25 ms target)`);

    // -------------------------------------------------------------
    // SUITE 7: GET /api/analytics/insights
    // -------------------------------------------------------------
    console.log('\n📊 Suite 7: Analytics Insights (GET /api/analytics/insights)');
    const insightsRes = await fetch(`${baseUrl}/api/analytics/insights`);
    assert(insightsRes.status === 200, 'Analytics endpoint returns HTTP 200');
    const insightsData = (await insightsRes.json()) as AnalyticsInsightsResponse;

    assert(insightsData.totalRestaurants >= 1000, `Analytics reports ${insightsData.totalRestaurants} total restaurants`);
    assert(Array.isArray(insightsData.topLocalities) && insightsData.topLocalities.length > 0, 'Analytics provides locality breakdown');
    assert(insightsData.topLocalities[0].avgCost > 0, `Top locality average cost calculated: ₹${insightsData.topLocalities[0].avgCost}`);
    assert(typeof insightsData.priceDistribution === 'object', 'Analytics provides price distribution breakdown');

  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('📡 Test server closed successfully.');
  }

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📋 PHASE 4 TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('===============================================================');

  if (totalFailed > 0) {
    console.error('💥 Phase 4 test suite finished with failures!');
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 4 TESTS PASSED! Backend API & Service Layer verified.\n');
  }
}

runPhase4Tests();
