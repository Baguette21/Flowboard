import { useMemo } from "react";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { fallbackData } from "@/data/fallback";
import type { Id } from "@convex/_generated/dataModel";
import type { MobileData, MobileDataStatus } from "@/types";

export function useMobileData(planId?: Id<"plans">) {
  const auth = useConvexAuth();
  const snapshot = useQuery(api.mobile.snapshot, planId ? { planId } : {});

  const status: MobileDataStatus = useMemo(() => {
    if (auth.isLoading || snapshot === undefined) return "loading";
    if (!auth.isAuthenticated && snapshot?.viewer === null) return "unauthenticated";
    return "live";
  }, [auth.isAuthenticated, auth.isLoading, snapshot]);

  const data = useMemo<MobileData>(() => {
    if (!snapshot) return fallbackData;
    return {
      ...fallbackData,
      ...snapshot,
      plans: snapshot.plans,
      selectedPlan: snapshot.selectedPlan,
      columns: snapshot.columns,
      cards: snapshot.cards,
      labels: snapshot.labels,
      members: snapshot.members,
      notes: snapshot.notes,
      drawings: snapshot.drawings,
      notifications: snapshot.notifications,
      searchResults: snapshot.searchResults,
      todayCards: snapshot.todayCards,
    };
  }, [snapshot]);

  return { data, status, isAuthenticated: auth.isAuthenticated, isLoading: auth.isLoading };
}
