# Phase 2: Candidate Retrieval & Filtering Engine (Hybrid Search)

## Overview
Phase 2 bridges the raw normalized dataset (3,000 restaurants from Phase 1) with the LLM reasoning layer. Instead of flooding the LLM context window with thousands of records, Phase 2 implements a **fast, heuristic candidate retrieval and ranking engine** that selects the top 15–25 best-fitting candidate restaurants in sub-millisecond time.

## Key Capabilities
1. **Multi-Attribute Deterministic Filter:**
   - **Locality Matching:** Exact & substring matching with fallback to neighboring areas or city-wide.
   - **Budget Control:** Soft & hard budget ceilings, price categories (`budget`, `moderate`, `upscale`, `luxury`).
   - **Rating Floor:** Minimum aggregate rating threshold.
   - **Cuisine Taxonomy & Synonyms:** Deep synonym mapping (e.g. "Pizza" maps to Italian; "Mughlai" maps to North Indian; "Cafe" maps to Coffee, Continental, Bakery).

2. **Bayesian Damped Scoring & Ranking:**
   - Uses Bayesian weighted mean:
     $$R_{\text{Bayesian}} = \frac{v \cdot R + m \cdot C}{v + m}$$
     *(where $C = 3.63$ dataset mean, $m = 25$ prior weight, $v = \text{votes}$)* to prevent 1-vote 5.0★ restaurants from unfairly dominating proven 4.5★ favorites with 5,000+ votes.
   - Composite scoring incorporating cuisine relevance, popularity logarithm, budget fit, and booking privileges.

3. **Intelligent Constraint Relaxation:**
   - If an overly strict query (e.g. 4.9★ rating under ₹150) yields $< 3$ results, the engine automatically softens constraints gracefully, annotating relaxed factors so the caller is informed.

4. **Token-Optimized Context Compressor:**
   - Formats candidate restaurants into a lean representation tailored for Gemini prompts to minimize token usage and latency.

## How to Run the Tests
```bash
npm run test:phase2
# or
npx tsx phase2/tests/phase2.test.ts
```
