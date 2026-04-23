import { useEffect, useMemo, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useProfileImageUrls(
  imageKeys: Array<string | null | undefined>,
) {
  const convex = useConvex();
  const [urls, setUrls] = useState<Record<string, string>>({});

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

  useEffect(() => {
    let cancelled = false;

    if (normalizedKeys.length === 0) {
      setUrls({});
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const result = await convex.action(api.r2.getProfileImageUrls, {
          keys: normalizedKeys,
        });
        if (!cancelled) {
          setUrls((current) => {
            const currentKeys = Object.keys(current);
            const nextKeys = Object.keys(result.urls);

            if (
              currentKeys.length === nextKeys.length &&
              currentKeys.every(
                (key) => current[key] === result.urls[key],
              )
            ) {
              return current;
            }

            return result.urls;
          });
        }
      } catch (error) {
        console.error("Failed to load profile images", error);
        if (!cancelled) {
          setUrls({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [convex, normalizedKeysSignature]);

  return urls;
}
