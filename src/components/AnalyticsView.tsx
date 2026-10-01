/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dining Analytics & Insights View
 */

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  IndianRupee,
  Star,
  MapPin,
  UtensilsCrossed,
  Layers
} from 'lucide-react';
import type { AnalyticsInsightsResponse } from '../../phase4/types.ts';
import { fetchAnalytics } from '../services/apiClient.ts';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsInsightsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching analytics:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-stone-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-stone-100 rounded-2xl" />
          <div className="h-64 bg-stone-100 rounded-2xl" />
          <div className="h-64 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase mb-1">
            <UtensilsCrossed className="w-4 h-4 text-amber-700" />
            <span>Total Venues</span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {data.totalRestaurants.toLocaleString()}
          </div>
          <p className="text-xs text-stone-500 mt-1">Normalized Bangalore dataset</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase mb-1">
            <IndianRupee className="w-4 h-4 text-amber-700" />
            <span>Avg Cost for Two</span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            ₹{data.averageCostForTwo}
          </div>
          <p className="text-xs text-stone-500 mt-1">Median across all tiers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase mb-1">
            <Star className="w-4 h-4 text-amber-700" />
            <span>Dataset Mean Rating</span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {data.averageRating.toFixed(2)}★
          </div>
          <p className="text-xs text-stone-500 mt-1">Bayesian baseline anchor</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-semibold uppercase mb-1">
            <MapPin className="w-4 h-4 text-amber-700" />
            <span>Micro-Markets</span>
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
            {data.topLocalities.length}+
          </div>
          <p className="text-xs text-stone-500 mt-1">Major Bangalore dining zones</p>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Neighborhood Cost & Rating Matrix */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">Neighborhood Dining Metrics</h3>
              <p className="text-xs text-stone-500">Average cost for two and customer ratings across Bangalore's dining hubs</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 font-semibold uppercase">
                  <th className="pb-3 pl-1">Neighborhood</th>
                  <th className="pb-3">Venues</th>
                  <th className="pb-3">Avg Rating</th>
                  <th className="pb-3 text-right pr-1">Avg Cost (2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.topLocalities.map((loc) => (
                  <tr key={loc.name} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3 pl-1 font-semibold text-stone-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{loc.name}</span>
                    </td>
                    <td className="py-3 text-stone-600 font-mono">{loc.count}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {loc.avgRating.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 text-right pr-1 font-mono font-medium text-stone-800">
                      ₹{loc.avgCost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuisines & Price Distributions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Price Category Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Price Tier Breakdown</h3>
            <div className="space-y-3">
              {(
                [
                  { key: 'budget', label: 'Budget (Under ₹500)', color: 'bg-emerald-600' },
                  { key: 'moderate', label: 'Moderate (₹500 - ₹1,200)', color: 'bg-amber-600' },
                  { key: 'upscale', label: 'Upscale (₹1,200 - ₹2,500)', color: 'bg-orange-600' },
                  { key: 'luxury', label: 'Luxury (₹2,500+)', color: 'bg-stone-900' }
                ] as const
              ).map((tier) => {
                const count = (data.priceDistribution as any)[tier.key] || 0;
                const pct = Math.round((count / data.totalRestaurants) * 100);
                return (
                  <div key={tier.key} className="space-y-1">
                    <div className="flex justify-between text-xs text-stone-700">
                      <span className="font-medium">{tier.label}</span>
                      <span className="font-mono text-stone-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${tier.color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Cuisines */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Top Bangalore Cuisines</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {data.topCuisines.slice(0, 10).map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100"
                >
                  <span className="text-stone-800 font-medium truncate">{c.name}</span>
                  <span className="text-stone-500 font-mono shrink-0 ml-1">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
