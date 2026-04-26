import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { MessageSquare, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfileAvatar } from "../../hooks/useProfileAvatar";
import { UserAvatar } from "../ui/UserAvatar";
import { cn } from "../../lib/utils";
import { usePrivacyMode } from "../../hooks/usePrivacyMode";

export function UserMenu() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const { name, email, imageUrl, role } = useProfileAvatar();
  const { enabled: privacyMode } = usePrivacyMode();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full shadow-md hover:scale-105 transition-transform"
        title="Account menu"
        aria-label="Open account menu"
        aria-expanded={open}
      >
        <UserAvatar
          name={name}
          email={email}
          imageUrl={imageUrl}
          size="lg"
          className={cn(
            "h-10 w-10 border-white/20",
            privacyMode && "blur-sm",
          )}
        />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-[90] mb-3 w-56 overflow-hidden rounded-xl border border-brand-sidebar-text/12 bg-brand-dark text-brand-sidebar-text shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-brand-sidebar-text/10 px-4 py-3">
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-bold", privacyMode && "blur-sm")}>
                {name ?? "Profile"}
              </p>
              {email ? (
                <p className="mt-0.5 truncate text-[11px] text-brand-sidebar-text/45">
                  {email}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-brand-sidebar-text/12 px-2 py-0.5 text-[10px] font-bold">
              {role}
            </span>
          </div>
          <div className="p-1.5">
            <UserMenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
            />
            <UserMenuItem
              icon={<MessageSquare className="h-4 w-4" />}
              label="Feedback"
              onClick={() => {
                setOpen(false);
                navigate("/feedback");
              }}
            />
          </div>
          <div className="border-t border-brand-sidebar-text/10 p-1.5">
            <UserMenuItem
              icon={<LogOut className="h-4 w-4" />}
              label="Sign out"
              onClick={() => void handleSignOut()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors",
        "text-brand-sidebar-text/88 hover:bg-brand-sidebar-text/10 hover:text-brand-sidebar-text",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center text-brand-sidebar-text/70">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
