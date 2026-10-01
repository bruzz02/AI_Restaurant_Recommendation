# Phase 5: Interactive Web UI (React + Tailwind CSS)

## Overview
Phase 5 delivers a modern, high-aesthetic web interface for **SavorAI — The Bangalore Culinary Concierge**.

Built with React 19, TypeScript, and Tailwind CSS, the frontend adheres to the Universal Frontend Design Constitution (anti-AI slop, zero-pill discipline, thoughtful typographic hierarchy, and warm dining aesthetics).

## Architecture & Views
1. **Concierge Recommendations View (`ConciergeView`)**:
   - Multi-attribute preference controls: Locality, Cuisines, Price Slider, Rating floor, Table Booking, and Occasion/Vibe.
   - Freeform natural language context input.
   - AI Reasoning Display: Concierge narrative summary, match scores, "Why You'll Love It" personalized rationales, highlighted signature dishes, and insider dining tips.
2. **Explore & Filter Catalog (`ExploreView`)**:
   - Search across all 3,000 verified restaurants.
   - Fast filtering by locality, cuisine, and price tier.
   - Real-time sorting by cost, votes, and rating.
   - Responsive grid with single-click detail inspection.
3. **Dining Analytics & Insights (`AnalyticsView`)**:
   - Visual breakdown of average dining costs and ratings across Bangalore's top neighborhoods.
   - Cuisine distribution and price category matrices.
4. **Restaurant Detail Modal (`RestaurantDetailModal`)**:
   - Comprehensive restaurant dossier with authentic user reviews, popular dishes, address, and amenities.

## Running Tests
```bash
npm run test:phase5
# or
npx tsx phase5/tests/phase5.test.ts
```
