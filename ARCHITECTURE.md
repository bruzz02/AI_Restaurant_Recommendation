# Architecture Design Document: AI Restaurant Recommendation Service

## 1. Executive Summary & Objective
The **AI Restaurant Recommendation Service** is an intelligent advisory system designed to bridge user dining preferences (budget/price tier, geographical location, rating threshold, and cuisine) with curated restaurant datasets. By combining deterministic filtering, vector/semantic retrieval, and Large Language Model (LLM) contextual reasoning, the service delivers personalized, highly explained restaurant recommendations rather than raw database rows.

**Target Dataset:** [Hugging Face: ManikaSaini/zomato-restaurant-recommendation](https://huggingface.co/datasets/ManikaSaini/zomato-restaurant-recommendation)

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT                                    |
|   +---------------------------------------------------------------------------+   |
|   |  Interactive UI: Preference Filters (Price, Locality, Cuisine, Min Rating)|   |
|   |  Natural Language Query / Prompt ("Romantic dinner under ₹1500 in Indiranagar")|
|   +---------------------------------------------------------------------------+   |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (Vite SPA -> Express API)
                                           v
+-----------------------------------------------------------------------------------+
|                                BACKEND API GATEWAY                                |
|   +---------------------------------------------------------------------------+   |
|   |  Validation & Query Normalization Middleware                              |   |
|   |  Rate Limiting, Cache (In-Memory / Redis-ready LRU)                       |   |
|   +---------------------------------------------------------------------------+   |
+---------------------+-------------------------------------+-----------------------+
                      |                                     |
                      v                                     v
+-------------------------------------+   +-----------------------------------------+
|     DATA REPOSITORY / RETRIEVAL     |   |          LLM REASONING ENGINE           |
|  +-------------------------------+  |   |  +-----------------------------------+  |
|  | Hugging Face Dataset Ingestion|  |   |  | Gemini 2.5 Flash / Pro via        |  |
|  | (Parquet / JSON / CSV)        |  |   |  | @google/genai SDK                 |  |
|  +-------------------------------+  |   |  +-----------------------------------+  |
|  | In-Memory Indexed Store       |  |   |  | Context-Aware System Instructions |  |
|  | - Location index              |  |   |  | Few-shot Schema Enforcement       |  |
|  | - Cuisine tag map             |  |   |  | Output Validation (Zod schema)    |  |
|  | - Price range & Rating filters|  |   |  +-----------------------------------+  |
|  | - Top-K Candidate Selection   |  |   |                                         |
|  +---------------+---------------+  |   |                                         |
+------------------|------------------+   +--------------------+--------------------+
                   |                                           ^
                   | 10-20 Filtered Candidates + User Context  |
                   +-------------------------------------------+
                                           |
                                           v Structured JSON Response
+-----------------------------------------------------------------------------------+
|                             RECOMMENDATION RESPONSE                               |
|   - Matched Restaurants with Match Score (0-100%)                                 |
|   - "Why You'll Love It" (LLM Reasoning tailored to user input)                   |
|   - Key Highlights (Popular dishes, vibe, price tier, delivery/dine-in status)    |
|   - Caveats / Best-for scenarios (e.g., "Great food, but busy on weekends")       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Pipeline & Schema Specification

### 3.1 Dataset Attributes (Zomato Dataset Mapping)
From `ManikaSaini/zomato-restaurant-recommendation`, raw columns typically include:
- `name`: Restaurant name
- `online_order`: Boolean / Yes/No
- `book_table`: Boolean / Yes/No
- `rate`: Formatted rating (e.g., `"4.1/5"`, `"NEW"`, `"-"`)
- `votes`: Number of ratings submitted
- `location`: Neighborhood / Locality (e.g., Banashankari, Indiranagar, Koramangala)
- `rest_type`: Casual Dining, Quick Bites, Cafe, Delivery, Pub, etc.
- `dish_liked`: Comma-separated popular dishes
- `cuisines`: Comma-separated cuisine tags (e.g., North Indian, Chinese, Continental)
- `approx_cost(for_two_people)`: Integer / Formatted numeric string (e.g., `"800"`, `"1,200"`)
- `reviews_list`: Sample user review tuples / sentiment excerpts
- `menu_item`: Available menu highlights
- `listed_in(type)`: Dining category (Buffet, Delivery, Dine-out, Pubs and bars)
- `listed_in(city)`: Administrative city / major zone

### 3.2 Normalized Internal Model (`RestaurantRecord`)
```typescript
export interface RestaurantRecord {
  id: string;
  name: string;
  city: string;
  locality: string;
  cuisines: string[];
  costForTwo: number;
  priceCategory: 'budget' | 'moderate' | 'upscale' | 'luxury'; // Budget: <=₹500, Moderate: ₹501-1200, Upscale: ₹1201-2500, Luxury: >₹2500
  rating: number; // Normalized float 0.0 - 5.0
  votes: number;
  restaurantType: string[];
  popularDishes: string[];
  hasOnlineBooking: boolean;
  hasTableBooking: boolean;
  reviewSnippets: string[];
  curatedSummary?: string;
}
```

---

## 4. Multi-Phase Implementation Plan

The project is structured into **6 discrete, verifiable phases**:

### Phase 1: Data Ingestion, Extraction & Preprocessing
* **Objective:** Ingest the Hugging Face dataset, clean anomalies, and establish a clean, query-ready data snapshot.
* **Key Tasks:**
  1. Automated retrieval script or pre-processed static bundle of `ManikaSaini/zomato-restaurant-recommendation`.
  2. Data normalization pipeline:
     - Strip `/5` and handle `"NEW"` / `"-"` rating anomalies (imputing or flagging unrated entries).
     - Clean and parse comma-separated strings (`cuisines`, `dish_liked`, `reviews_list`).
     - Parse `approx_cost(for_two_people)` removing currency commas (`"1,200"` -> `1200`).
     - Deduplicate restaurant chains across multiple neighborhood listings.
  3. Export optimized JSON/SQLite/Indexed DB artifact for deterministic querying.
* **Deliverable:** `src/data/restaurants.json` (or partitioned indices) + ingestion validation suite.

---

### Phase 2: Candidate Retrieval & Filtering Engine (Hybrid Search)
* **Objective:** Rapidly narrow down tens of thousands of records to the top 15–25 candidates before calling the LLM, reducing latency and token costs.
* **Key Tasks:**
  1. Multi-attribute deterministic filter:
     - **Location / Place:** Exact locality match with fallback to parent city/zone.
     - **Price:** Price band or max budget range filter (`costForTwo <= budget`).
     - **Rating:** Minimum rating threshold (`rating >= minRating`, sorted by Bayesian weighted rating considering vote volume).
     - **Cuisine:** Fuzzy tag intersection (e.g., `"Italian"` matches `"Pizza"`, `"Pasta"`, `"Continental"`).
  2. Heuristic scoring formula to rank candidate pool:
     $$\text{Score} = w_1 \cdot \text{RatingNorm} + w_2 \cdot \log(\text{Votes}) + w_3 \cdot \text{CuisineMatch} - w_4 \cdot |\text{BudgetDelta}|$$
  3. Context window optimization: Format top candidate attributes into a compact, token-efficient JSON format for LLM consumption.
* **Deliverable:** `src/server/services/retrievalService.ts` with unit tests for edge queries.

---

### Phase 3: LLM Reasoning, Scoring & Synthesis Engine
* **Objective:** Leverage Google Gemini via `@google/genai` to analyze user nuances, re-rank candidates, and generate personalized explanations.
* **Key Tasks:**
  1. **Prompt Architecture:**
     - System prompt defining the role as an expert culinary concierge.
     - Inject user explicit criteria + freeform text preferences (e.g., "anniversary dinner", "spicy food", "vegan friendly").
     - Inject top candidate restaurants with their ratings, cost, cuisines, and review snippets.
  2. **Structured JSON Output:**
     - Enforce response schema via Gemini `responseSchema` (JSON mode):
       ```typescript
       interface LLMRecommendationResponse {
         userSummary: string;
         recommendations: Array<{
           restaurantId: string;
           restaurantName: string;
           matchScore: number; // 0-100
           whyRecommended: string;
           mustTryDishes: string[];
           bestFor: string;
           budgetVerdict: string;
           caveatOrTip?: string;
         }>;
         alternativeSuggestion?: string;
       }
       ```
  3. Fallback logic: If LLM API has rate-limit issues, seamlessly fallback to deterministic rule-based ranking with pre-templated explanations.
* **Deliverable:** `src/server/services/recommendationEngine.ts` with structured schema enforcement.

---

### Phase 4: Backend API & Service Layer
* **Objective:** Expose clean, performant, and secure API endpoints connecting the frontend and recommendation engine.
* **Key Tasks:**
  1. **Endpoints:**
     - `GET /api/health`: Health status and dataset statistics.
     - `GET /api/meta`: Available locations, cuisine list, and price categories for UI dropdowns/autocomplete.
     - `POST /api/recommend`: Main endpoint accepting:
       ```json
       {
         "location": "Indiranagar",
         "cuisines": ["North Indian", "Mughlai"],
         "maxPrice": 1200,
         "minRating": 4.0,
         "vibe": "Family dinner, quiet atmosphere",
         "dietaryPreferences": ["Halal", "Vegetarian-friendly"]
       }
       ```
  2. In-memory LRU caching based on query hashes (price + location + cuisine hash) to prevent duplicate LLM calls for identical requests.
  3. Input sanitization and error handling.
* **Deliverable:** `server.ts` + Express routes & controller tests.

---

### Phase 5: Client Frontend & User Experience
* **Objective:** Build an intuitive, responsive interface for configuring preferences and reviewing recommendations.
* **Key Tasks:**
  1. **Preference Form Component:**
     - Quick preset chips (e.g., "Casual Weekend Lunch", "Romantic Date", "Budget Bites", "Late Night Cravings").
     - Dynamic Locality selector with live search.
     - Budget slider with currency presets (₹).
     - Rating threshold slider / stars.
     - Cuisine multi-select with search and popular tags.
     - Freeform natural language prompt input.
  2. **Results Display Component:**
     - Recommendation Cards with Match Score badge (e.g., 95% Match).
     - "Why this fits your taste" highlights.
     - Must-order dishes tags.
     - Direct details: Cost for two, locality, dine-in / table booking status.
     - Side-by-side comparison modal for shortlisted restaurants.
  3. **State Management & Loading States:**
     - Skeleton loading animations while the LLM processes reasoning.
     - Empty-state suggestions if criteria are too narrow (with automatic loosening suggestions).
* **Deliverable:** Responsive React application (`src/components/*`, `src/App.tsx`).

---

### Phase 6: Observability, Evaluation & Hardening
* **Objective:** Ensure production readiness, accuracy evaluation, and continuous quality checks.
* **Key Tasks:**
  1. **Evaluation Benchmarks:**
     - Test suite of 20 benchmark user personas with known optimal restaurant matches.
     - Metric: Hallucination rate (verifying every recommended dish/attribute exists in dataset).
     - Metric: Relevance score & latency tracking (< 2s response target).
  2. **Telemetry & Guardrails:**
     - Graceful handling of missing locations or zero-result queries.
     - Prompt injection defenses (ignoring attempts to hijack the recommender instructions).
  3. **Production build verification:** Ensure seamless bundling with Vite and Express dev/production runners.
* **Deliverable:** Test harness, evaluation rubric, and complete deployment readiness.

---

## 5. Technology Stack & Key Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Tailwind CSS v4, Lucide Icons, Motion | User interface, reactive filters, animations |
| **Backend** | Node.js, Express, TypeScript, tsx | API orchestration and proxying |
| **Dataset Source** | Hugging Face (`ManikaSaini/zomato-restaurant-recommendation`) | Raw Zomato restaurant catalogue |
| **LLM Provider** | Google Gemini (`@google/genai` SDK - Gemini 2.5 Flash) | Reasoning, contextual re-ranking, and rationale synthesis |
| **Data Storage / Index** | Optimized in-memory index / JSON store with inverted indices | Fast candidate retrieval prior to LLM pass |
| **Build & Tooling** | Vite 8, TypeScript 7 | Hot-reloading and production bundling |

---

## 6. Execution Roadmap & Next Steps

When moving to implementation, the recommended sequence is:
1. **Bootstrap Phase 1 & 2:** Download and normalize the Hugging Face dataset slice; build `retrievalService.ts` to test candidate retrieval.
2. **Implement Phase 3 & 4:** Build `server.ts` with Gemini API integration and structured JSON output.
3. **Build Phase 5:** Create the UI with intuitive controls and recommendation cards.
4. **Finalize Phase 6:** Validate response quality and edge cases.
