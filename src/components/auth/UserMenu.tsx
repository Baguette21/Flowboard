import { useState, useRef, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "../../hooks/useTheme";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
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
