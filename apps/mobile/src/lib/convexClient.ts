import { ConvexReactClient } from "convex/react";

const DEFAULT_CONVEX_URL = "https://jovial-hawk-350.eu-west-1.convex.cloud";
const DEFAULT_CONVEX_SITE_URL = "https://jovial-hawk-350.eu-west-1.convex.site";

const readEnv = (name: string) => process.env[name]?.trim();

export const convexUrl =
  readEnv("EXPO_PUBLIC_CONVEX_URL") ??
  readEnv("VITE_CONVEX_URL") ??
  DEFAULT_CONVEX_URL;

export const convexSiteUrl =
  readEnv("EXPO_PUBLIC_CONVEX_SITE_URL") ??
  readEnv("VITE_CONVEX_SITE_URL") ??
  DEFAULT_CONVEX_SITE_URL;

export const convex = new ConvexReactClient(convexUrl);
