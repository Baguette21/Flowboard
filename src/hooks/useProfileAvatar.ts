import { useEffect, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  getCachedProfileImageUrl,
  setCachedProfileImageUrl,
} from "../lib/profileImageCache";

export function useProfileAvatar() {
  const me = useQuery(api.users.me);
  const convex = useConvex();
  const imageKey = me?.imageKey ?? null;
  const [url, setUrl] = useState<string | null>(() =>
    imageKey ? getCachedProfileImageUrl(imageKey) : null,
  );

  useEffect(() => {
    let cancelled = false;

    if (!imageKey) {
      setUrl(null);
      return () => {
        cancelled = true;
      };
    }

    const cached = getCachedProfileImageUrl(imageKey);
    if (cached) {
      setUrl(cached);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const result = await convex.action(api.r2.getProfileImageUrl, {
          key: imageKey,
        });
        if (!cancelled) {
          setCachedProfileImageUrl(imageKey, result.url);
          setUrl(result.url);
        }
      } catch (error) {
        console.error("Failed to load profile image", error);
        if (!cancelled) {
          setUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [convex, imageKey]);

  return {
    name: me?.name ?? null,
    email: me?.email ?? null,
    imageKey,
    imageUrl: url,
    role: me?.role ?? "FREE",
  };
}
