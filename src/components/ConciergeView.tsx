/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Concierge Recommendations View
 */

import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  IndianRupee,
  Star,
  Utensils,
  Lightbulb,
  Info,
  Calendar,
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import type { RecommendApiResponse } from '../../phase4/types.ts';
import type { RestaurantRecord } from '../types/restaurant.ts';
import { getRecommendations } from '../services/apiClient.ts';

interface ConciergeViewProps {
  locations: string[];
  cuisines: string[];
  onSelectRestaurant: (restaurant: RestaurantRecord) => void;
}

const COMMON_OCCASIONS = [
  'Romantic Date Night',
  'Family Dinner & Celebration',
  'Casual Catchup with Friends',
  'Quick Budget Feast',
  'Work Session & Artisanal Coffee',
  'Late Night Food Run'
];

const POPULAR_CUISINES = [
  'North Indian',
  'South Indian',
  'Continental',
  'Chinese',
  'Cafe',
  'Biryani',
  'Italian',
  'Desserts',
  'Asian'
];

export const ConciergeView: React.FC<ConciergeViewProps> = ({
  locations,
  onSelectRestaurant
}) => {
  // Form State
  const [selectedLocation, setSelectedLocation] = useState<string>('JP Nagar');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['North Indian']);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(4.0);
  const [vibeOrOccasion, setVibeOrOccasion] = useState<string>('Family Dinner & Celebration');
  const [mustHaveTableBooking, setMustHaveTableBooking] = useState<boolean>(false);
  const [mustHaveOnlineOrder, setMustHaveOnlineOrder] = useState<boolean>(false);
  const [freeformPrompt, setFreeformPrompt] = useState<string>('');

  // Execution State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationResult, setRecommendationResult] = useState<RecommendApiResponse | null>(null);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  const handleRecommend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await getRecommendations({
        location: selectedLocation || undefined,
        cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined,
        maxPrice,
        minRating: minRating > 0 ? minRating : undefined,
        vibeOrOccasion: vibeOrOccasion || undefined,
        mustHaveTableBooking,
        mustHaveOnlineOrder,
        freeformPrompt: freeformPrompt.trim() || undefined
      });
      setRecommendationResult(res);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err?.message || 'Failed to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedLocation('');
    setSelectedCuisines([]);
    setMaxPrice(1200);
    setMinRating(0);
    setVibeOrOccasion('');
    setMustHaveTableBooking(false);
    setMustHaveOnlineOrder(false);
    setFreeformPrompt('');
  };

  return (
    <div className="space-y-8">
      {/* Hero Intro */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-amber-900/40 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-amber-300 mb-3">
            <Sparkles className="w-4 h-4" />
            <span>AI Culinary Intelligence & Reasoning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight mb-3">
            Personalized Dining, Curated for Bangalore.
          </h1>
          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            Tell us your budget, neighborhood, and occasion. SavorAI filters 3,000 restaurants using Bayesian scoring and generates tailored dining rationales.
          </p>
        </div>
      </div>

      {/* Main Grid: Form + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Preference Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h2 className="font-serif font-semibold text-lg text-stone-900">Your Dining Criteria</h2>
            <button
              onClick={resetFilters}
              type="button"
              className="text-xs text-stone-500 hover:text-amber-800 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handleRecommend} className="space-y-5">
            {/* Locality Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                Locality / Neighborhood
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                >
                  <option value="">Any Locality in Bangalore</option>
                  {locations.slice(0, 30).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Occasion / Vibe */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                Dining Occasion & Mood
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_OCCASIONS.map((occ) => {
                  const isSelected = vibeOrOccasion === occ;
                  return (
                    <button
                      type="button"
                      key={occ}
                      onClick={() => setVibeOrOccasion(isSelected ? '' : occ)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cuisines */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                Preferred Cuisines
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CUISINES.map((c) => {
                  const isSelected = selectedCuisines.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleCuisine(c)}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Budget for Two
                </label>
                <span className="text-sm font-semibold text-amber-800 font-mono">₹{maxPrice}</span>
              </div>
              <input
                type="range"
                min="200"
                max="3500"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
                className="w-full accent-amber-800 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>Budget (₹200)</span>
                <span>Moderate (₹1,000)</span>
                <span>Fine Dining (₹3,500+)</span>
              </div>
            </div>

            {/* Rating Floor */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                Minimum Rating
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Any', value: 0 },
                  { label: '3.5+ ★', value: 3.5 },
                  { label: '4.0+ ★', value: 4.0 },
                  { label: '4.5+ ★', value: 4.5 }
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setMinRating(opt.value)}
                    className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                      minRating === opt.value
                        ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="space-y-2 pt-1 border-t border-stone-100">
              <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mustHaveTableBooking}
                  onChange={(e) => setMustHaveTableBooking(e.target.checked)}
                  className="rounded border-stone-300 text-amber-800 focus:ring-amber-700"
                />
                <span>Must have table reservation capability</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mustHaveOnlineOrder}
                  onChange={(e) => setMustHaveOnlineOrder(e.target.checked)}
                  className="rounded border-stone-300 text-amber-800 focus:ring-amber-700"
                />
                <span>Must offer online delivery / takeout</span>
              </label>
            </div>

            {/* Freeform Prompt / Specific craving */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Specific Craving or Ambience Wish (Optional)
              </label>
              <textarea
                rows={2}
                value={freeformPrompt}
                onChange={(e) => setFreeformPrompt(e.target.value)}
                placeholder="e.g. Authentic ghee podi idli, outdoor garden seating, or spicy mutton sukka"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Culinary Recommendations...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Curate Top Recommendations</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Recommendations Feed */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Results Summary Box */}
          {recommendationResult && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Concierge Briefing</span>
                </span>
                <span>
                  {recommendationResult.totalCandidatesEvaluated} candidates evaluated · {recommendationResult.executionTimeMs}ms
                </span>
              </div>
              <p className="text-sm text-stone-800 leading-relaxed font-serif">
                "{recommendationResult.summary}"
              </p>
              {recommendationResult.wasRelaxed && recommendationResult.relaxedFactors.length > 0 && (
                <div className="pt-2 border-t border-stone-200 text-xs text-amber-800">
                  <span className="font-medium">Filter adjustments:</span> {recommendationResult.relaxedFactors.join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* Empty / Initial State */}
          {!recommendationResult && !loading && (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">
                  Ready to Discover Bangalore's Best?
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Select your neighborhood and preferences on the left, then click <strong>Curate Top Recommendations</strong> to receive personalized dining matches.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRecommend()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-800 text-white text-sm font-medium rounded-xl hover:bg-amber-900 transition-colors shadow-xs"
              >
                <span>Curate for JP Nagar</span>
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-6 border border-stone-200 animate-pulse space-y-3">
                  <div className="h-5 bg-stone-200 rounded w-1/3" />
                  <div className="h-4 bg-stone-100 rounded w-1/4" />
                  <div className="h-16 bg-stone-100 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Recommendations List */}
          {recommendationResult && !loading && (
            <div className="space-y-4">
              {recommendationResult.recommendations.map((rec, index) => (
                <article
                  key={rec.id}
                  className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs hover:border-amber-700/50 hover:shadow-md transition-all group"
                >
                  {/* Top Bar: Match Score & Ranking */}
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                        #{index + 1} Best Match
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                        {rec.matchScore}% Match
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-stone-800">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{rec.rating !== null ? rec.rating.toFixed(1) : 'New'}</span>
                      <span className="text-stone-400 font-normal">({rec.votes.toLocaleString()})</span>
                    </div>
                  </div>

                  {/* Title & Core Metadata */}
                  <div className="mb-3">
                    <h3 className="text-xl font-serif font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                      {rec.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {rec.locality}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-0.5 font-medium text-stone-700">
                        <IndianRupee className="w-3 h-3" />
                        ₹{rec.costForTwo} for two
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.cuisines.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>

                  {/* Why You'll Love It (LLM Rationale) */}
                  <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-100 mb-3 text-sm text-stone-700 leading-relaxed">
                    <p className="font-serif">
                      <strong className="text-stone-900 font-sans text-xs uppercase tracking-wider block mb-1">
                        Why You'll Love It:
                      </strong>
                      {rec.whyRecommended}
                    </p>
                  </div>

                  {/* Signature Dishes */}
                  {rec.highlightedDishes && rec.highlightedDishes.length > 0 && (
                    <div className="mb-3 text-xs">
                      <span className="font-semibold text-stone-600 block mb-1 flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-amber-700" />
                        Must-Try Signature Items:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.highlightedDishes.map((dish) => (
                          <span
                            key={dish}
                            className="bg-amber-50 text-amber-900 border border-amber-200/50 px-2 py-0.5 rounded font-mono text-[11px]"
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags & Advice Footer */}
                  <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      {rec.diningTip && (
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{rec.diningTip}</span>
                        </div>
                      )}
                      <div className="text-stone-500">
                        <span className="font-medium text-stone-700">{rec.bestFor}</span> · {rec.priceVerdict}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRestaurant(rec)}
                      className="px-3.5 py-1.5 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors cursor-pointer shrink-0"
                    >
                      View Dossier & Reviews
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
