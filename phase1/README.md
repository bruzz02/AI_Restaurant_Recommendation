# Phase 1: Data Ingestion, Extraction & Preprocessing

## Overview
Phase 1 handles the automated extraction, normalization, and quality validation of the Zomato Bangalore Restaurant dataset from Hugging Face:
- **Source Dataset:** [ManikaSaini/zomato-restaurant-recommendation](https://huggingface.co/datasets/ManikaSaini/zomato-restaurant-recommendation)
- **Target File:** `src/data/restaurants.json`
- **Metadata Files:** `src/data/dataset_summary.json`, `src/data/metadata_indices.json`

## Components in this Folder
1. **`ingest.py`**: Stream-based Python ingestion pipeline that fetches the CSV, cleans formatting anomalies, normalizes currency/ratings, extracts review snippets, and deduplicates restaurants.
2. **`types.ts`**: TypeScript definitions and contracts for normalized restaurant entities and query filters.
3. **`validator.ts`**: Schema and bounds verification rules.
4. **`tests/phase1.test.ts`**: Automated test suite executing 7 comprehensive test suites (data integrity, bounds, deduplication, search by price/place/rating/cuisine, and latency benchmarks).

## How to Run

### Run the Ingestion Pipeline
```bash
python3 phase1/ingest.py
```

### Run the Test Suite
```bash
npm run test:phase1
# or
npx tsx phase1/tests/phase1.test.ts
```
