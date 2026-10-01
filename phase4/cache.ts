/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 4: In-Memory TTL Query Cache
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000, maxItems: number = 200) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxItems = maxItems;
  }

  public get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  public set(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxItems) {
      // Evict oldest inserted key
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}
