import React from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useMobileProfileAvatar(fallback?: {
  name?: string | null;
  email?: string | null;
  imageKey?: string | null;
  role?: string | null;
}) {
  const convex = useConvex();
  const me = useQuery(api.users.me);
  const profile = me ?? fallback ?? null;
  const imageKey = profile?.imageKey ?? null;
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!imageKey) {
      setImageUrl(null);
      setImageError(null);
      return;
    }

    setImageError(null);
    void convex
      .action(api.r2.getProfileImageUrl, { key: imageKey })
      .then((result) => {
        if (!cancelled) setImageUrl(result.url);
      })
      .catch((error) => {
        if (!cancelled) {
          setImageUrl(null);
          setImageError(error instanceof Error ? error.message : "Could not load profile photo");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [convex, imageKey]);

  const identity = profile?.name ?? profile?.email ?? "PT";
  const initials = identity.replace(/@.*/, "").slice(0, 2).toUpperCase();

  return {
    name: profile?.name ?? fallback?.name ?? null,
    email: profile?.email ?? fallback?.email ?? null,
    imageKey,
    imageUrl,
    imageError,
    initials,
    role: profile?.role ?? fallback?.role ?? null,
  };
}
