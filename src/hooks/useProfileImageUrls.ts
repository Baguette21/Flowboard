import { useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  getCachedProfileImageUrl,
  setCachedProfileImageUrl,
} from "../lib/profileImageCache";

function buildCachedUrls(keys: readonly string[]) {
  const urls: Record<string, string> = {};
  for (const key of keys) {
    const cached = getCachedProfileImageUrl(key);
    if (cached) urls[key] = cached;
  }
  return urls;
}

export function useProfileImageUrls(
  imageKeys: Array<string | null | undefined>,
) {
  const convex = useConvex();

  const normalizedKeys = useMemo(
    () =>
      Array.from(
        new Set(
          imageKeys.filter(
            (key): key is string =>
              typeof key === "string" && key.startsWith("avatars/"),
          ),
        ),
      ).sort(),
    [imageKeys.join("|")],
  );
  const normalizedKeysSignature = useMemo(
    () => normalizedKeys.join("|"),
    [normalizedKeys],
  );

  const [urls, setUrls] = useState<Record<string, string>>(() =>
    buildCachedUrls(normalizedKeys),
  );

  useEffect(() => {
    let cancelled = false;

    if (normalizedKeys.length === 0) {
      setUrls((current) => (Object.keys(current).length === 0 ? current : {}));
      return () => {
        cancelled = true;
      };
    }

    const fromCache = buildCachedUrls(normalizedKeys);
    setUrls((current) => {
      const currentKeys = Object.keys(current);
      const cacheKeys = Object.keys(fromCache);
      if (
        currentKeys.length === cacheKeys.length &&
        cacheKeys.every((key) => current[key] === fromCache[key])
      ) {
        return current;
      }
      return fromCache;
    });

    const missingKeys = normalizedKeys.filter((key) => !fromCache[key]);
    if (missingKeys.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const result = await convex.action(api.r2.getProfileImageUrls, {
          keys: missingKeys,
        });
        if (cancelled) return;

        for (const [key, url] of Object.entries(result.urls)) {
          setCachedProfileImageUrl(key, url);
        }

        setUrls((current) => {
          const next = { ...current, ...result.urls };
          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(next);
          if (
            currentKeys.length === nextKeys.length &&
            nextKeys.every((key) => current[key] === next[key])
          ) {
            return current;
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to load profile images", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [convex, normalizedKeysSignature]);

  return urls;
}
