import { ConvexReactClient } from "convex/react";

export const convexUrl =
  process.env.VITE_CONVEX_URL ??
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  "https://steady-mammoth-571.eu-west-1.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
