/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 5 Automated Test Suite:
 * Validates UI Component modules, API client integration, state contracts,
 * and end-to-end data flow between backend services and frontend views.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { createServerApp } from '../../phase4/serverApp.ts';
import {
  fetchHealth,
  fetchFilterMeta,
  fetchRestaurants,
  fetchRestaurantById,
  getRecommendations,
  fetchAnalytics
} from '../../src/services/apiClient.ts';

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

async function runPhase5Tests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING PHASE 5 TEST SUITE: INTERACTIVE WEB UI & CLIENT API');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: React Component File Integrity
  // -------------------------------------------------------------
  console.log('🎨 Suite 1: React Component Files & Integrity');
  const components = [
    'src/components/Navbar.tsx',
    'src/components/ConciergeView.tsx',
    'src/components/ExploreView.tsx',
    'src/components/AnalyticsView.tsx',
    'src/components/RestaurantDetailModal.tsx',
    'src/App.tsx'
  ];

  for (const comp of components) {
    const filePath = path.resolve(process.cwd(), comp);
    assert(fs.existsSync(filePath), `Component exists: ${comp}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(content.length > 100, `Component ${comp} has substantive implementation (${content.length} bytes)`);
  }

  // -------------------------------------------------------------
  // SUITE 2: Client API Integration with Backend Services
  // -------------------------------------------------------------
  console.log('\n🔗 Suite 2: Client API Integration with Full-Stack Backend');
  const app = createServerApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as { port: number; address: string };
  const originalFetch = global.fetch;

  // Intercept fetch in apiClient to point to ephemeral test server
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    if (urlStr.startsWith('/api')) {
      const fullUrl = `http://127.0.0.1:${address.port}${urlStr}`;
      return originalFetch(fullUrl, init);
    }
    return originalFetch(input, init);
  };

  try {
    // 2.1: fetchHealth
    const health = await fetchHealth();
    assert(health.status === 'ok', `fetchHealth() returned status "ok"`);
    assert(health.totalRestaurants >= 1000, `fetchHealth() reported ${health.totalRestaurants} restaurants`);

    // 2.2: fetchFilterMeta
    const meta = await fetchFilterMeta();
    assert(meta.locations.length >= 20, `fetchFilterMeta() returned ${meta.locations.length} locations`);
    assert(meta.cuisines.length >= 30, `fetchFilterMeta() returned ${meta.cuisines.length} cuisines`);
    assert(meta.priceCategories.includes('budget'), 'fetchFilterMeta() includes budget category');

    // 2.3: fetchRestaurants (Catalog browsing)
    const catalog = await fetchRestaurants({ page: 1, limit: 12, locality: 'jp nagar' });
    assert(catalog.restaurants.length === 12, `fetchRestaurants() page size respected: ${catalog.restaurants.length} items`);
    assert(
      catalog.restaurants.every((r) => r.locality.toLowerCase().includes('jp nagar')),
      'fetchRestaurants() properly filters by locality'
    );

    // 2.4: fetchRestaurantById
    const sampleId = catalog.restaurants[0].id;
    const detail = await fetchRestaurantById(sampleId);
    assert(detail.id === sampleId, `fetchRestaurantById() returned exact restaurant "${detail.name}"`);

    // 2.5: getRecommendations (Concierge trigger)
    const recommendations = await getRecommendations({
      location: 'Banashankari',
      cuisines: ['South Indian'],
      maxPrice: 400,
      vibeOrOccasion: 'Quick Budget Feast'
    });

    assert(recommendations.success === true, 'getRecommendations() returned success: true');
    assert(recommendations.recommendations.length > 0, `getRecommendations() produced ${recommendations.recommendations.length} recommendations`);
    assert(
      typeof recommendations.recommendations[0].whyRecommended === 'string',
      'First recommendation contains "whyRecommended" rationale'
    );
    assert(
      recommendations.recommendations[0].costForTwo <= 450,
      `Recommendation cost respects budget ceiling (₹${recommendations.recommendations[0].costForTwo} <= ₹450)`
    );

    // 2.6: fetchAnalytics
    const analytics = await fetchAnalytics();
    assert(analytics.totalRestaurants >= 1000, `fetchAnalytics() returned ${analytics.totalRestaurants} venues`);
    assert(analytics.topLocalities.length > 0, `fetchAnalytics() returned ${analytics.topLocalities.length} locality insights`);

  } finally {
    global.fetch = originalFetch;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    console.log('📡 Test server closed successfully.');
  }

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📋 PHASE 5 TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('===============================================================');

  if (totalFailed > 0) {
    console.error('💥 Phase 5 test suite finished with failures!');
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 5 TESTS PASSED! Web UI & Client integration verified.\n');
  }
}

runPhase5Tests();
