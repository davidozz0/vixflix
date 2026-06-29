interface CacheEntry {
  m3u8: string;
  createdAt: Date;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

export function set(key: string, m3u8: string): void {
  cache.set(key, { m3u8, createdAt: new Date() });
}

export function get(key: string): string | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt.getTime() > TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.m3u8;
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
