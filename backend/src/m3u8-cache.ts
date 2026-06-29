// backend/src/m3u8-cache.ts
// Cache per contenuti M3U8 con metadati associati

export interface CachedStream {
  m3u8: string;
  variantUrl?: string;
  embedUrl?: string;
  createdAt: Date;
}

const cache = new Map<string, CachedStream>();
const TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

export function set(key: string, m3u8: string, extra?: { variantUrl?: string; embedUrl?: string }): void {
  cache.set(key, {
    m3u8,
    variantUrl: extra?.variantUrl,
    embedUrl: extra?.embedUrl,
    createdAt: new Date(),
  });
}

export function get(key: string): CachedStream | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt.getTime() > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry;
}

export function startCleanup(): ReturnType<typeof setInterval> {
  return setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now - entry.createdAt.getTime() > TTL_MS) {
        cache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}
