/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SavorAI Bangalore Application Root
 */

import React, { useState, useEffect } from 'react';
import { Navbar, type ActiveTab } from './components/Navbar.tsx';
import { ConciergeView } from './components/ConciergeView.tsx';
import { ExploreView } from './components/ExploreView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { RestaurantDetailModal } from './components/RestaurantDetailModal.tsx';
import type { RestaurantRecord } from './types/restaurant.ts';
import { fetchFilterMeta, fetchHealth } from './services/apiClient.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('concierge');
  const [locations, setLocations] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [totalRestaurants, setTotalRestaurants] = useState<number>(3000);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantRecord | null>(null);

  useEffect(() => {
    fetchFilterMeta()
      .then((meta) => {
        setLocations(meta.locations || []);
        setCuisines(meta.cuisines || []);
      })
      .catch((err) => console.error('Failed to load filter metadata:', err));

    fetchHealth()
      .then((h) => {
        if (h.totalRestaurants) setTotalRestaurants(h.totalRestaurants);
      })
      .catch((err) => console.error('Failed to load health info:', err));
  }, []);

  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-900 font-sans flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalRestaurants={totalRestaurants}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'concierge' && (
          <ConciergeView
            locations={locations}
            cuisines={cuisines}
            onSelectRestaurant={setSelectedRestaurant}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreView
            locations={locations}
            cuisines={cuisines}
            onSelectRestaurant={setSelectedRestaurant}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white py-6 mt-12 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SavorAI — Curated Bangalore Dining Concierge.</p>
          <div className="flex items-center gap-4 text-stone-600">
            <span>Normalized Zomato Dataset (3,000 Venues)</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Flash Hybrid Reasoning</span>
          </div>
        </div>
      </footer>

      {/* Detail Dossier Modal */}
      <RestaurantDetailModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />
    </div>
  );
}
