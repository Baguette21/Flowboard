// R2 presigned URLs are issued with a 3600s lifetime. Cache short of that to leave headroom.
const CACHE_TTL_MS = 50 * 60 * 1000;

type Entry = { url: string; fetchedAt: number };

const cache = new Map<string, Entry>();

export function getCachedProfileImageUrl(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.url;
}

export function setCachedProfileImageUrl(key: string, url: string) {
  cache.set(key, { url, fetchedAt: Date.now() });
}
