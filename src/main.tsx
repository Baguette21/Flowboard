import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider, initializeTheme } from "./hooks/useTheme";
import { initializeAppearance } from "./hooks/useAppearance";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

initializeTheme();
initializeAppearance();

// Show a setup guide if Convex is not yet configured
if (!convexUrl || convexUrl.includes("your-deployment")) {
  document.getElementById("root")!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F3EE;font-family:'Space Mono',monospace;padding:2rem">
      <div style="max-width:480px;text-align:center">
        <div style="width:48px;height:48px;background:#E63B2E;border-radius:12px;margin:0 auto 24px;"></div>
        <h1 style="font-family:'DM Serif Display',serif;font-style:italic;font-size:2rem;margin-bottom:8px">FlowBoard needs Convex</h1>
        <p style="color:#666;margin-bottom:24px;line-height:1.6;font-size:13px">
          This app uses Convex for its real-time backend. Run the command below to connect:
        </p>
        <div style="background:#111;color:#fff;padding:16px 20px;border-radius:16px;font-size:13px;text-align:left;margin-bottom:20px">
          <code>npx convex dev</code>
        </div>
        <p style="color:#999;font-size:11px;line-height:1.6">
          This will create a free Convex project and auto-populate<br/>
          <strong>VITE_CONVEX_URL</strong> in your <code>.env.local</code> file.<br/>
          Then restart the dev server with <code>npm run dev</code>.
        </p>
      </div>
    </div>
  `;
} else {
  const convex = new ConvexReactClient(convexUrl);

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <ConvexAuthProvider client={convex}>
          <BrowserRouter>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--color-brand-text)",
                  color: "var(--color-brand-bg)",
                  border: "2px solid var(--color-brand-text)",
                  borderRadius: "1rem",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "13px",
                },
              }}
            />
          </BrowserRouter>
        </ConvexAuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
