/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Explore & Filter Catalog View (3,000 Restaurants)
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  IndianRupee,
  Star,
  ChevronLeft,
  ChevronRight,
  Filter,
  Utensils
} from 'lucide-react';
import type { RestaurantRecord, PriceCategory } from '../types/restaurant.ts';
import type { PaginatedRestaurantsResponse } from '../../phase4/types.ts';
import { fetchRestaurants } from '../services/apiClient.ts';

interface ExploreViewProps {
  locations: string[];
  cuisines: string[];
  onSelectRestaurant: (restaurant: RestaurantRecord) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  locations,
  cuisines,
  onSelectRestaurant
}) => {
  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedLocality, setSelectedLocality] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<PriceCategory | ''>('');
  const [sortBy, setSortBy] = useState<'rating' | 'votes' | 'cost_asc' | 'cost_desc'>('rating');
  const [page, setPage] = useState<number>(1);

  // Data & State
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<PaginatedRestaurantsResponse | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchRestaurants({
      page,
      limit: 18,
      search: search.trim() || undefined,
      locality: selectedLocality || undefined,
      cuisine: selectedCuisine || undefined,
      priceCategory: selectedPriceCategory || undefined,
      sortBy
    })
      .then((res) => {
        if (!isCancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching restaurants:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [page, search, selectedLocality, selectedCuisine, selectedPriceCategory, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
        {/* Search Input & Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by restaurant name, dish (e.g. biryani), or keyword..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold uppercase text-stone-500 shrink-0">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            >
              <option value="rating">Highest Rating</option>
              <option value="votes">Most Reviewed</option>
              <option value="cost_asc">Price: Low to High</option>
              <option value="cost_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-100">
          {/* Locality */}
          <div>
            <select
              value={selectedLocality}
              onChange={(e) => {
                setSelectedLocality(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
            >
              <option value="">All Neighborhoods</option>
              {locations.slice(0, 40).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Cuisine */}
          <div>
            <select
              value={selectedCuisine}
              onChange={(e) => {
                setSelectedCuisine(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-none"
            >
              <option value="">All Cuisines</option>
              {cuisines.slice(0, 40).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Price Category Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            {(['', 'budget', 'moderate', 'upscale', 'luxury'] as const).map((tier) => (
              <button
                type="button"
                key={tier}
                onClick={() => {
                  setSelectedPriceCategory(tier as any);
                  setPage(1);
                }}
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg capitalize transition-colors ${
                  selectedPriceCategory === tier
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tier || 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          Showing {data?.restaurants.length || 0} of {data?.totalMatches.toLocaleString() || 0} venues
        </span>
        {data && <span>Page {data.page} of {data.totalPages}</span>}
      </div>

      {/* Grid of Restaurant Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-stone-200 animate-pulse space-y-3">
              <div className="h-5 bg-stone-200 rounded w-2/3" />
              <div className="h-3 bg-stone-100 rounded w-1/3" />
              <div className="h-10 bg-stone-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.restaurants.map((r) => (
            <article
              key={r.id}
              onClick={() => onSelectRestaurant(r)}
              className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-amber-700/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="capitalize font-medium text-stone-500">
                    {r.priceCategory} Dining
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-stone-800">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{r.rating !== null ? r.rating.toFixed(1) : 'New'}</span>
                    <span className="text-stone-400 font-normal">({r.votes})</span>
                  </div>
                </div>

                <h3 className="font-serif font-bold text-lg text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                  {r.name}
                </h3>

                <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 mb-3">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    {r.locality}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-0.5 font-medium text-stone-700">
                    <IndianRupee className="w-3 h-3" />
                    ₹{r.costForTwo} for 2
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {r.cuisines.slice(0, 3).map((c) => (
                    <span key={c} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>

                {r.popularDishes.length > 0 && (
                  <p className="text-xs text-stone-500 line-clamp-1">
                    <span className="font-medium text-stone-700">Dishes: </span>
                    {r.popularDishes.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-400">
                  {r.hasTableBooking ? 'Booking available' : 'Walk-in'}
                </span>
                <span className="font-medium text-amber-800 group-hover:translate-x-0.5 transition-transform">
                  View Dossier →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono text-stone-600 px-2">
            {page} / {data.totalPages}
          </span>

          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
