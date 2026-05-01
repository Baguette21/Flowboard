import { createContext, useContext } from "react";
import type { Id } from "@/lib/api";

export type MainTab = "workspace" | "inbox" | "notifications" | "profile";

export type Route =
  | { name: "signIn" }
  | { name: "signUp" }
  | { name: "verifyEmail"; email: string }
  | { name: "forgotPassword" }
  | { name: "main"; tab: MainTab }
  | { name: "board"; boardId: Id<"boards"> }
  | { name: "card"; cardId: Id<"cards"> }
  | { name: "note"; noteId: Id<"notes"> }
  | { name: "drawing"; drawingId: Id<"drawings"> }
  | { name: "invites" };

export type Navigation = {
  route: Route;
  navigate: (route: Route) => void;
  replace: (route: Route) => void;
  back: () => void;
};

export const NavigationContext = createContext<Navigation | null>(null);

export function useAppNavigation() {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error("useAppNavigation must be used inside NavigationContext");
  }
  return value;
}
