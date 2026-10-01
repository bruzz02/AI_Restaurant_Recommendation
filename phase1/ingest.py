#!/usr/bin/env python3
"""
Phase 1: Ingestion Script for Hugging Face Dataset:
https://huggingface.co/datasets/ManikaSaini/zomato-restaurant-recommendation
"""

import sys
import os
import csv
import json
import re
import urllib.request
import io
from datetime import datetime
from collections import Counter

# Increase CSV field size limit for large review columns
csv.field_size_limit(sys.maxsize)

DATASET_URL = "https://huggingface.co/datasets/ManikaSaini/zomato-restaurant-recommendation/resolve/main/zomato.csv"
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, "src", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "restaurants.json")
SUMMARY_FILE = os.path.join(OUTPUT_DIR, "dataset_summary.json")
INDICES_FILE = os.path.join(OUTPUT_DIR, "metadata_indices.json")

REVIEW_REGEX = re.compile(r"\('Rated\s+([0-9.]+)',\s*'RATED\s*\\n\s*(.*?)'\)", re.DOTALL)

def clean_text(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r'[\r\n\t]+', ' ', text)
    cleaned = re.sub(r'[ÃÂâ€œ”’™•\x80-\xff]+', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()

def parse_rating(rate_str: str):
    if not rate_str:
        return None, "Unrated"
    rate_clean = rate_str.strip()
    if rate_clean in ("NEW", "-", "None", ""):
        return None, "NEW" if rate_clean == "NEW" else "Unrated"
    if "/" in rate_clean:
        rate_clean = rate_clean.split("/")[0].strip()
    try:
        val = round(float(rate_clean), 1)
        if 0.0 <= val <= 5.0:
            return val, f"{val:.1f}"
    except ValueError:
        pass
    return None, "Unrated"

def parse_cost(cost_str: str) -> int:
    if not cost_str:
        return 600
    clean_num = re.sub(r'[^\d]', '', cost_str.strip())
    try:
        val = int(clean_num)
        return val if val > 0 else 600
    except ValueError:
        return 600

def get_price_category(cost: int) -> str:
    if cost <= 500:
        return "budget"
    elif cost <= 1200:
        return "moderate"
    elif cost <= 2500:
        return "upscale"
    else:
        return "luxury"

def parse_split_list(val_str: str) -> list[str]:
    if not val_str or val_str.lower() in ("none", "nan", "-", "[]", ""):
        return []
    parts = [clean_text(p) for p in val_str.split(",")]
    return [p for p in parts if p and len(p) > 1]

def extract_reviews(review_str: str, max_reviews: int = 3) -> list[dict]:
    if not review_str or review_str in ("[]", "None", ""):
        return []
    results = []
    matches = REVIEW_REGEX.findall(review_str)
    for r_str, snippet in matches[:max_reviews]:
        try:
            rating_val = float(r_str)
        except ValueError:
            rating_val = 4.0
        cleaned_snippet = clean_text(snippet)
        if len(cleaned_snippet) > 280:
            cleaned_snippet = cleaned_snippet[:277] + "..."
        if cleaned_snippet:
            results.append({
                "rating": rating_val,
                "text": cleaned_snippet
            })
    return results

def slugify(text: str) -> str:
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text.lower()).strip('-')
    return text[:40]

def run_ingestion(max_records_limit: int = 3000):
    print(f"[*] Starting Hugging Face ingestion from: {DATASET_URL}")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    req = urllib.request.Request(
        DATASET_URL,
        headers={"User-Agent": "Zomato-AI-RecService-Phase1/1.0"}
    )

    restaurant_map = {}
    row_count = 0

    with urllib.request.urlopen(req) as resp:
        text_stream = io.TextIOWrapper(resp, encoding="utf-8", errors="replace")
        reader = csv.DictReader(text_stream)

        for row in reader:
            row_count += 1
            name = clean_text(row.get("name", ""))
            location = clean_text(row.get("location", ""))
            address = clean_text(row.get("address", ""))

            if not name or len(name) < 2:
                continue
            if not location:
                location = "Bangalore"

            votes_raw = row.get("votes", "0")
            try:
                votes = int(re.sub(r'[^\d]', '', str(votes_raw)))
            except ValueError:
                votes = 0

            rating_val, rating_str = parse_rating(row.get("rate", ""))
            cost = parse_cost(row.get("approx_cost(for two people)", ""))
            cuisines = parse_split_list(row.get("cuisines", ""))
            dishes = parse_split_list(row.get("dish_liked", ""))
            rest_types = parse_split_list(row.get("rest_type", ""))
            online_order = row.get("online_order", "").strip().lower() == "yes"
            book_table = row.get("book_table", "").strip().lower() == "yes"
            reviews = extract_reviews(row.get("reviews_list", ""))
            city = clean_text(row.get("listed_in(city)", "Bangalore"))

            norm_key = f"{name.lower()}||{location.lower()}"

            existing = restaurant_map.get(norm_key)
            if existing:
                if votes > existing["votes"] or (len(dishes) > len(existing["popularDishes"])):
                    combined_dishes = list(dict.fromkeys(existing["popularDishes"] + dishes))
                    combined_reviews = existing["reviews"] if len(existing["reviews"]) >= len(reviews) else reviews
                    existing["votes"] = max(existing["votes"], votes)
                    existing["popularDishes"] = combined_dishes
                    existing["reviews"] = combined_reviews
                    if rating_val and not existing["rating"]:
                        existing["rating"] = rating_val
                        existing["ratingString"] = rating_str
                continue

            record_id = f"{slugify(name)}-{slugify(location)}-{abs(hash(address)) % 10000}"
            restaurant_map[norm_key] = {
                "id": record_id,
                "name": name,
                "address": address,
                "city": city or "Bangalore",
                "locality": location,
                "cuisines": cuisines,
                "costForTwo": cost,
                "priceCategory": get_price_category(cost),
                "rating": rating_val,
                "ratingString": rating_str,
                "votes": votes,
                "restaurantType": rest_types,
                "popularDishes": dishes,
                "hasOnlineOrder": online_order,
                "hasTableBooking": book_table,
                "reviews": reviews,
                "phone": clean_text(row.get("phone", "")),
                "url": clean_text(row.get("url", ""))
            }

            if len(restaurant_map) >= max_records_limit:
                break

    restaurants = list(restaurant_map.values())
    restaurants.sort(key=lambda r: ((r["rating"] or 0), r["votes"]), reverse=True)

    location_counter = Counter(r["locality"] for r in restaurants if r["locality"])
    cuisine_counter = Counter(c for r in restaurants for c in r["cuisines"])
    price_counter = Counter(r["priceCategory"] for r in restaurants)

    rating_buckets = {
        "4.5+": 0, "4.0 - 4.4": 0, "3.5 - 3.9": 0,
        "3.0 - 3.4": 0, "< 3.0": 0, "Unrated / New": 0
    }
    total_rated, sum_rating, sum_cost = 0, 0.0, 0
    for r in restaurants:
        sum_cost += r["costForTwo"]
        rat = r["rating"]
        if rat is None:
            rating_buckets["Unrated / New"] += 1
        elif rat >= 4.5:
            rating_buckets["4.5+"] += 1
            total_rated += 1
            sum_rating += rat
        elif rat >= 4.0:
            rating_buckets["4.0 - 4.4"] += 1
            total_rated += 1
            sum_rating += rat
        elif rat >= 3.5:
            rating_buckets["3.5 - 3.9"] += 1
            total_rated += 1
            sum_rating += rat
        elif rat >= 3.0:
            rating_buckets["3.0 - 3.4"] += 1
            total_rated += 1
            sum_rating += rat
        else:
            rating_buckets["< 3.0"] += 1
            total_rated += 1
            sum_rating += rat

    avg_rating = round(sum_rating / total_rated, 2) if total_rated > 0 else 0.0
    avg_cost = round(sum_cost / len(restaurants), 0) if restaurants else 0

    metadata_summary = {
        "datasetSource": DATASET_URL,
        "ingestedAt": datetime.utcnow().isoformat() + "Z",
        "totalRawRowsProcessed": row_count,
        "totalUniqueRestaurants": len(restaurants),
        "locationsCount": len(location_counter),
        "topLocations": [{"name": loc, "count": cnt} for loc, cnt in location_counter.most_common(25)],
        "cuisinesCount": len(cuisine_counter),
        "topCuisines": [{"name": c, "count": cnt} for c, cnt in cuisine_counter.most_common(35)],
        "priceDistribution": {
            "budget": price_counter["budget"],
            "moderate": price_counter["moderate"],
            "upscale": price_counter["upscale"],
            "luxury": price_counter["luxury"]
        },
        "averageCostForTwo": int(avg_cost),
        "averageRating": avg_rating,
        "ratingDistribution": rating_buckets
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(restaurants, f, indent=2, ensure_ascii=False)

    with open(SUMMARY_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata_summary, f, indent=2, ensure_ascii=False)

    metadata_indices = {
        "locations": [loc for loc, _ in location_counter.most_common(60)],
        "cuisines": [c for c, _ in cuisine_counter.most_common(80)],
        "priceCategories": ["budget", "moderate", "upscale", "luxury"],
        "priceRanges": {
            "min": min((r["costForTwo"] for r in restaurants), default=100),
            "max": max((r["costForTwo"] for r in restaurants), default=5000),
            "average": int(avg_cost)
        }
    }
    with open(INDICES_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata_indices, f, indent=2, ensure_ascii=False)

    print(f"[✔] Phase 1 ingestion finished: Saved {len(restaurants)} restaurants.")

if __name__ == "__main__":
    limit = 3000
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            pass
    run_ingestion(limit)
