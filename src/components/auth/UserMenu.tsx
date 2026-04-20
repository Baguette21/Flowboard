import { useState, useRef, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, LogOut, Moon, Sun, User } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";
import { useExperimentalFeatures } from "../../hooks/useExperimentalFeatures";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const { theme, toggle } = useTheme();
  const { features, setFeature } = useExperimentalFeatures();
  const [open, setOpen] = useState(false);
  const [showExperimental, setShowExperimental] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const primaryIdentity = me?.email ?? me?.name ?? "FlowBoard User";
  const secondaryIdentity = me?.email
    ? me.name ?? "Verified account"
    : "No verified email";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center font-mono text-sm font-bold shadow-md hover:scale-105 transition-transform"
        title="User menu"
      >
        <User className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-brand-primary border-2 border-brand-text/10 rounded-[12px] shadow-xl overflow-hidden z-50 py-1">
          <div className="px-4 py-3 border-b border-brand-text/10">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-text/50 mb-0.5">
              Signed in
            </p>
            <p className="font-bold text-sm truncate">{primaryIdentity}</p>
            <p className="font-mono text-xs text-brand-text/50 truncate mt-1">
              {secondaryIdentity}
            </p>
          </div>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-brand-text/6 text-brand-text transition-colors text-left"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={() => setShowExperimental((current) => !current)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-brand-text/6 text-brand-text transition-colors text-left"
          >
            <FlaskConical className="w-4 h-4" />
            Experimental settings
          </button>
          {showExperimental && (
            <div className="mx-2 mb-1 rounded-[12px] border border-brand-text/10 bg-brand-bg/60 p-3">
              <div className="mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text/45">
                  Test Features
                </p>
                <p className="mt-1 text-xs text-brand-text/60">
                  Board tabs stay hidden until the header is hovered.
                </p>
              </div>

              <button
                onClick={() =>
                  setFeature("multiBoardTabs", !features.multiBoardTabs)
                }
                className="flex w-full items-start gap-3 rounded-[10px] px-1 py-1 text-left"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-10 flex-shrink-0 rounded-full p-0.5 transition-colors",
                    features.multiBoardTabs ? "bg-brand-accent" : "bg-brand-text/15",
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      features.multiBoardTabs ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-brand-text">
                    Hover board tabs
                  </span>
                  <span className="block text-xs text-brand-text/55">
                    Keep multiple boards open and switch between them from the app header.
                  </span>
                </span>
              </button>
            </div>
          )}
          <button
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-brand-accent/10 text-brand-accent transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
