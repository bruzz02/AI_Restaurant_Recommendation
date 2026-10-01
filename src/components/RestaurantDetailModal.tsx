/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Restaurant Detail Modal Component
 */

import React from 'react';
import { X, Star, MapPin, IndianRupee, Utensils, CheckCircle2, MessageSquare } from 'lucide-react';
import type { RestaurantRecord } from '../types/restaurant.ts';

interface RestaurantDetailModalProps {
  restaurant: RestaurantRecord | null;
  onClose: () => void;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  restaurant,
  onClose
}) => {
  if (!restaurant) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500 mb-1">
              <span>{restaurant.locality}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{restaurant.priceCategory} Dining</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-900">{restaurant.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-stone-600">
              <div className="flex items-center gap-1 text-amber-700 font-semibold">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{restaurant.rating !== null ? restaurant.rating.toFixed(1) : 'New'}</span>
                <span className="text-stone-400 font-normal">({restaurant.votes.toLocaleString()} votes)</span>
              </div>
              <div className="flex items-center gap-1 font-medium text-stone-700">
                <IndianRupee className="w-3.5 h-3.5" />
                <span>₹{restaurant.costForTwo} for two</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Address & Amenities */}
          <div className="flex items-start gap-2 text-sm text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span>{restaurant.address}</span>
          </div>

          {/* Amenities & Attributes */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 bg-stone-50/50">
              <CheckCircle2 className={`w-4 h-4 ${restaurant.hasTableBooking ? 'text-emerald-600' : 'text-stone-400'}`} />
              <span className={restaurant.hasTableBooking ? 'text-stone-900 font-medium' : 'text-stone-500'}>
                {restaurant.hasTableBooking ? 'Table Booking Available' : 'No Table Booking'}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-stone-100 bg-stone-50/50">
              <CheckCircle2 className={`w-4 h-4 ${restaurant.hasOnlineOrder ? 'text-emerald-600' : 'text-stone-400'}`} />
              <span className={restaurant.hasOnlineOrder ? 'text-stone-900 font-medium' : 'text-stone-500'}>
                {restaurant.hasOnlineOrder ? 'Online Ordering Available' : 'Dine-in Only'}
              </span>
            </div>
          </div>

          {/* Cuisines & Types */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Cuisines & Specialities</h4>
            <div className="flex flex-wrap gap-2">
              {restaurant.cuisines.map((c) => (
                <span key={c} className="text-xs bg-stone-100 text-stone-800 px-2.5 py-1 rounded-md font-medium">
                  {c}
                </span>
              ))}
              {restaurant.restaurantType.map((t) => (
                <span key={t} className="text-xs bg-amber-50 text-amber-900 border border-amber-200/50 px-2.5 py-1 rounded-md font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Popular Dishes */}
          {restaurant.popularDishes.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-amber-700" />
                <span>Popular Signature Dishes</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {restaurant.popularDishes.map((dish) => (
                  <span key={dish} className="text-xs bg-stone-100/80 text-stone-700 px-2 py-0.5 rounded border border-stone-200/60 font-mono">
                    {dish}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Real Customer Reviews */}
          {restaurant.reviews && restaurant.reviews.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                <span>Customer Review Highlights</span>
              </h4>
              <div className="space-y-3">
                {restaurant.reviews.slice(0, 3).map((rev, idx) => (
                  <div key={idx} className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 text-xs text-stone-700">
                    <div className="flex items-center justify-between mb-1.5 text-stone-500">
                      <span className="font-semibold text-stone-800">{rev.rating ? `${rev.rating}★` : 'Review'}</span>
                      <span className="text-[11px] text-stone-400">Verified Diners</span>
                    </div>
                    <p className="leading-relaxed text-stone-600 italic">"{rev.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
