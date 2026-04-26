import { useEffect, useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  FileText,
  LayoutGrid,
  Loader2,
  LogOut,
  Moon,
  Palette,
  PencilLine,
  RotateCcw,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cn } from "../../lib/utils";
import { useProfileAvatar } from "../../hooks/useProfileAvatar";
import { useTheme } from "../../hooks/useTheme";
import {
  APPEARANCE_PRESETS,
  useAppearance,
  type AppFont,
} from "../../hooks/useAppearance";
import { usePrivacyMode } from "../../hooks/usePrivacyMode";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface SettingsPanelProps {
  onClose?: () => void;
  activeSection?: "account" | "privacy" | "customization" | "archive" | "shortcuts";
}

type PasswordStep = "idle" | "awaitingCode";
type ArchivedItem =
  | { kind: "board"; id: Id<"boards">; title: string; archivedAt: number | null }
  | { kind: "note"; id: Id<"notes">; title: string; archivedAt: number | null }
  | { kind: "draw"; id: Id<"drawings">; title: string; archivedAt: number | null };

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (error.message === "Invalid code") {
      return "The code is invalid or expired.";
    }
    if (error.message === "PasswordResetDeliveryFailed") {
      return "We couldn't send the reset email right now. Please try again once email delivery is fixed.";
    }
    return error.message;
  }
  return fallback;
}

export function SettingsPanel({ onClose, activeSection }: SettingsPanelProps) {
  const navigate = useNavigate();
  const { signIn, signOut } = useAuthActions();
  const { name, email, role } = useProfileAvatar();
  const { enabled: privacyMode, setEnabled: setPrivacyMode } = usePrivacyMode();
  const { theme, toggle } = useTheme();
  const {
    settings: appearance,
    stored: storedAppearance,
    setFont,
    applyPreset,
    updateCustomPalette,
    reset: resetAppearance,
  } = useAppearance();
  const updateProfile = useMutation(api.users.updateProfile);
  const archivedBoards = useQuery(api.boards.listArchived);
  const archivedNotes = useQuery(api.notes.listArchived);
  const archivedDrawings = useQuery(api.drawings.listArchived);
  const updateBoard = useMutation(api.boards.update);
  const updateNote = useMutation(api.notes.update);
  const updateDrawing = useMutation(api.drawings.update);
  const deleteBoard = useMutation(api.boards.remove);
  const deleteNote = useMutation(api.notes.remove);
  const deleteDrawing = useMutation(api.drawings.remove);

  const [draftName, setDraftName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [restoringItemKey, setRestoringItemKey] = useState<string | null>(null);
  const [deletingArchivedItem, setDeletingArchivedItem] = useState<ArchivedItem | null>(null);
  const [isDeletingArchivedItem, setIsDeletingArchivedItem] = useState(false);

  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    setDraftName(name ?? "");
    setPasswordStep("idle");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }, [name]);

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) {
      toast.error("Name cannot be empty");
      return;
    }
    if (trimmed === (name ?? "")) {
      return;
    }

    setIsSavingName(true);
    try {
      await updateProfile({ name: trimmed });
      toast.success("Name updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update name"));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSendResetCode = async () => {
    if (!email) {
      toast.error("No email on file for this account");
      return;
    }
    setPasswordError("");
    setIsPasswordLoading(true);
    try {
      await signIn("password", { flow: "reset", email });
    } catch (error) {
      console.error("Password reset request failed", error);
    } finally {
      toast.success(`We sent a verification code to ${email}`);
      setPasswordStep("awaitingCode");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordLoading(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");

    if (!email) {
      setPasswordError("No email on file for this account");
      return;
    }
    if (verificationCode.trim().length < 6) {
      setPasswordError("Enter the 6-digit code from your email");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsPasswordLoading(true);
    try {
      const result = await signIn("password", {
        flow: "reset-verification",
        email,
        code: verificationCode.trim(),
        newPassword,
      });
      if (!result.signingIn) {
        throw new Error("Invalid code");
      }
      toast.success("Password updated");
      setPasswordStep("idle");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(getErrorMessage(error, "Failed to update password"));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
    navigate("/login");
  };

  const otpDigits = useMemo(
    () => Array.from({ length: 6 }, (_, index) => verificationCode[index] ?? ""),
    [verificationCode],
  );
  const archivedItems = useMemo<ArchivedItem[] | undefined>(() => {
    if (
      archivedBoards === undefined ||
      archivedNotes === undefined ||
      archivedDrawings === undefined
    ) {
      return undefined;
    }

    return [
      ...archivedBoards.map((board) => ({
        kind: "board" as const,
        id: board._id,
        title: board.name,
        archivedAt: board.archivedAt,
      })),
      ...archivedNotes.map((note) => ({
        kind: "note" as const,
        id: note._id,
        title: note.title || "Untitled",
        archivedAt: note.archivedAt ?? null,
      })),
      ...archivedDrawings.map((drawing) => ({
        kind: "draw" as const,
        id: drawing._id,
        title: drawing.title || "Untitled",
        archivedAt: drawing.archivedAt ?? null,
      })),
    ].sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
  }, [archivedBoards, archivedDrawings, archivedNotes]);

  const getArchivedItemKey = (item: ArchivedItem) => `${item.kind}-${item.id}`;

  const handleRestoreArchivedItem = async (item: ArchivedItem) => {
    const itemKey = getArchivedItemKey(item);
    setRestoringItemKey(itemKey);
    try {
      if (item.kind === "board") {
        await updateBoard({ boardId: item.id, archivedAt: null });
      } else if (item.kind === "note") {
        await updateNote({ noteId: item.id, archivedAt: null });
      } else {
        await updateDrawing({ drawingId: item.id, archivedAt: null });
      }
      toast.success("Restored from archive");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to restore item"));
    } finally {
      setRestoringItemKey(null);
    }
  };

  const handleDeleteArchivedItem = async () => {
    if (!deletingArchivedItem) return;
    setIsDeletingArchivedItem(true);
    try {
      if (deletingArchivedItem.kind === "board") {
        await deleteBoard({ boardId: deletingArchivedItem.id });
      } else if (deletingArchivedItem.kind === "note") {
        await deleteNote({ noteId: deletingArchivedItem.id });
      } else {
        await deleteDrawing({ drawingId: deletingArchivedItem.id });
      }
      toast.success("Deleted permanently");
      setDeletingArchivedItem(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete item"));
    } finally {
      setIsDeletingArchivedItem(false);
    }
  };

  const sectionLabel =
    "mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-brand-text/45";
  const fieldLabel =
    "mb-1.5 block font-mono text-xs uppercase tracking-widest text-brand-text/60";
  const inputClass =
    "h-11 w-full rounded-[10px] border-2 border-brand-text/15 bg-brand-primary/85 px-4 font-sans text-sm text-brand-text placeholder:text-brand-text/35 transition-colors focus:border-brand-text/45 focus:outline-none";
  const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-text px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-bg transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButton =
    "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-brand-text/15 bg-brand-primary/70 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-text transition-colors hover:border-brand-text/40 hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
  const dangerButton =
    "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-brand-accent/25 bg-brand-accent/8 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-accent transition-colors hover:bg-brand-accent/15 disabled:cursor-not-allowed disabled:opacity-60";
  const showSection = (
    section: NonNullable<SettingsPanelProps["activeSection"]>,
  ) => activeSection === undefined || activeSection === section;

  return (
    <>
      <div className="space-y-8 px-6 py-6">
        <section className={cn(!showSection("account") && "hidden")}>
          <p className={sectionLabel}>Username</p>
          <label className={fieldLabel}>Display name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Your name"
              className={inputClass}
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => void handleSaveName()}
              disabled={
                isSavingName ||
                draftName.trim().length === 0 ||
                draftName.trim() === (name ?? "")
              }
              className={cn(primaryButton, "flex-shrink-0")}
            >
              {isSavingName ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
          {email && (
            <p className="mt-2 font-mono text-[11px] text-brand-text/45">
              Signed in as {email}
            </p>
          )}
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("account") && "hidden")} />

        <section className={cn(!showSection("account") && "hidden")}>
          <p className={sectionLabel}>Password</p>
          {passwordStep === "idle" ? (
            <div className="space-y-3">
              <p className="font-mono text-xs text-brand-text/55">
                We&apos;ll send a 6-digit code to{" "}
                <span className="text-brand-text">{email ?? "your email"}</span>{" "}
                to verify the change.
              </p>
              <button
                type="button"
                onClick={() => void handleSendResetCode()}
                disabled={isPasswordLoading || !email}
                className={primaryButton}
              >
                {isPasswordLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Send verification code
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => void handleChangePassword(event)}
              className="space-y-3"
            >
              <div>
                <label className={fieldLabel}>Verification code</label>
                <div className="group relative">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    aria-label="Verification code"
                    className="absolute inset-0 z-10 cursor-pointer opacity-0 focus:outline-none"
                  />
                  <div className="grid h-11 grid-cols-6 gap-1.5 rounded-[10px] border-2 border-brand-text/15 bg-brand-primary/85 p-1.5 group-focus-within:border-brand-text/45">
                    {otpDigits.map((digit, index) => {
                      const isActive =
                        verificationCode.length < 6 &&
                        index === verificationCode.length;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-center rounded-[9px] border border-brand-text/10 bg-brand-bg/70 font-mono text-sm font-bold tabular-nums",
                            digit
                              ? "border-brand-text/25 text-brand-text"
                              : "text-brand-text/22",
                            isActive && "border-brand-text/40 bg-brand-bg",
                          )}
                        >
                          {digit || "0"}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className={fieldLabel}>New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className={fieldLabel}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <p className="rounded-[10px] border border-brand-accent/20 bg-brand-accent/10 px-3 py-2 font-mono text-[11px] text-brand-accent">
                  {passwordError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className={primaryButton}
                >
                  {isPasswordLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Update password
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendResetCode()}
                  disabled={isPasswordLoading}
                  className={secondaryButton}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordStep("idle");
                    setPasswordError("");
                    setVerificationCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isPasswordLoading}
                  className="font-mono text-xs uppercase tracking-[0.14em] text-brand-text/55 transition-colors hover:text-brand-text"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("account") && "hidden")} />

        <section className={cn(!showSection("account") && "hidden")}>
          <p className={sectionLabel}>Account</p>
          <div className="rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-brand-text/45">
                  Current plan
                </p>
                <p className="mt-1 text-base font-semibold text-brand-text">
                  {role} account
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
                  role === "PRO"
                    ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                    : "border-brand-text/12 bg-brand-text/6 text-brand-text/55",
                )}
              >
                {role}
              </span>
            </div>
            <p className="mt-3 text-sm text-brand-text/60">
              {role === "PRO"
                ? "Your account has PRO upload access."
                : "Your account is on the FREE plan."}
            </p>
          </div>
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("privacy") && "hidden")} />

        <section className={cn(!showSection("privacy") && "hidden")}>
          <p className={sectionLabel}>Privacy</p>
          <div className="rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-text">Privacy mode</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-text/55">
                  Blur your profile picture and username on this device only.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={privacyMode}
                onClick={() => setPrivacyMode(!privacyMode)}
                className={cn(
                  "relative h-7 w-12 flex-shrink-0 rounded-full border transition-colors",
                  privacyMode
                    ? "border-brand-accent/50 bg-brand-accent"
                    : "border-brand-text/15 bg-brand-text/10",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-brand-bg shadow-sm transition-transform",
                    privacyMode ? "translate-x-5" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("archive") && "hidden")} />

        <section className={cn(!showSection("archive") && "hidden")}>
          <p className={sectionLabel}>Archive</p>
          <div className="rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            {archivedItems === undefined ? (
              <div className="flex items-center gap-2 font-mono text-xs text-brand-text/45">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading archived items...
              </div>
            ) : archivedItems.length === 0 ? (
              <p className="font-mono text-xs text-brand-text/45">
                Archived boards, notes, and drawings will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {archivedItems.map((item) => {
                  const itemKey = getArchivedItemKey(item);
                  return (
                    <ArchivedItemRow
                      key={itemKey}
                      item={item}
                      isRestoring={restoringItemKey === itemKey}
                      onRestore={() => void handleRestoreArchivedItem(item)}
                      onDelete={() => setDeletingArchivedItem(item)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("customization") && "hidden")} />

        <section className={cn(!showSection("customization") && "hidden")}>
          <p className={sectionLabel}>Customization</p>
          <div className="space-y-3 rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <div className="rounded-[10px] card-whisper bg-brand-bg/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text/45">
                Presets
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {APPEARANCE_PRESETS.map((preset) => {
                  const isActive = appearance.presetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={cn(
                        "flex min-h-20 items-start gap-3 rounded-[10px] border p-3 text-left transition-colors",
                        isActive
                          ? "border-brand-text/35 bg-brand-text/8"
                          : "border-brand-text/10 bg-brand-bg/65 hover:border-brand-text/25",
                      )}
                    >
                      <span className="mt-0.5 flex flex-shrink-0 overflow-hidden rounded-md border border-brand-text/10">
                        <span
                          className="h-8 w-4"
                          style={{
                            backgroundColor: preset.light.backgroundColor,
                          }}
                        />
                        <span
                          className="h-8 w-4"
                          style={{ backgroundColor: preset.light.accentColor }}
                        />
                        <span
                          className="h-8 w-4 border-l border-brand-text/10"
                          style={{ backgroundColor: preset.dark.backgroundColor }}
                        />
                        <span
                          className="h-8 w-4"
                          style={{ backgroundColor: preset.dark.accentColor }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-brand-text">
                          {preset.name}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-brand-text/55">
                          {preset.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center justify-between rounded-[10px] card-whisper bg-brand-bg/70 px-4 py-3 text-left transition-colors hover:border-brand-text/30"
            >
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-brand-text/45">
                  Theme
                </span>
                <span className="mt-1 block text-sm font-medium text-brand-text">
                  {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                </span>
              </span>
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-brand-text/60" />
              ) : (
                <Moon className="h-4 w-4 text-brand-text/60" />
              )}
            </button>

            {appearance.presetId === "custom" ? (
            <>
            <div className="rounded-[10px] card-whisper bg-brand-bg/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text/45">
                    App font
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand-text">
                    Choose the typeface used across FlowBoard.
                  </p>
                </div>
                <Palette className="h-4 w-4 flex-shrink-0 text-brand-text/50" />
              </div>
              <select
                value={appearance.font}
                onChange={(event) =>
                  setFont(event.target.value as AppFont)
                }
                className="h-10 w-full rounded-[10px] card-whisper bg-brand-bg px-3 text-sm text-brand-text outline-none transition-colors focus:border-brand-text/35"
              >
                <option value="inter">Inter</option>
                <option value="system">System</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </div>

            <div className="rounded-[10px] card-whisper bg-brand-bg/70 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text/45">
                Custom colors
              </p>
              <div className="mt-3 grid gap-5">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-text/45">
                    Light mode
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ColorField
                      label="Accent"
                      value={storedAppearance.custom.light.accentColor}
                      onChange={(value) =>
                        updateCustomPalette("light", { accentColor: value })
                      }
                    />
                    <ColorField
                      label="Background"
                      value={storedAppearance.custom.light.backgroundColor}
                      onChange={(value) =>
                        updateCustomPalette("light", { backgroundColor: value })
                      }
                    />
                    <ColorField
                      label="Text"
                      value={storedAppearance.custom.light.textColor}
                      onChange={(value) =>
                        updateCustomPalette("light", { textColor: value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-text/45">
                    Dark mode
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ColorField
                      label="Accent"
                      value={storedAppearance.custom.dark.accentColor}
                      onChange={(value) =>
                        updateCustomPalette("dark", { accentColor: value })
                      }
                    />
                    <ColorField
                      label="Background"
                      value={storedAppearance.custom.dark.backgroundColor}
                      onChange={(value) =>
                        updateCustomPalette("dark", { backgroundColor: value })
                      }
                    />
                    <ColorField
                      label="Text"
                      value={storedAppearance.custom.dark.textColor}
                      onChange={(value) =>
                        updateCustomPalette("dark", { textColor: value })
                      }
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetAppearance}
                className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-brand-text/12 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/60 transition-colors hover:border-brand-text/30 hover:text-brand-text"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset appearance
              </button>
            </div>
            </>
            ) : null}
          </div>
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("shortcuts") && "hidden")} />

        <section className={cn(!showSection("shortcuts") && "hidden")}>
          <p className={sectionLabel}>Keyboard shortcuts</p>
          <div className="grid gap-2 rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <ShortcutRow label="Search" keys="/" />
            <ShortcutRow label="Toggle sidebar" keys="Ctrl + B" />
            <ShortcutRow label="New board" keys="Use + in Boards" />
            <ShortcutRow label="New note" keys="Use + in Notes" />
            <ShortcutRow label="New drawing" keys="Use + in Draw" />
          </div>
        </section>

        <div className={cn("h-px bg-brand-text/8", !showSection("account") && "hidden")} />

        <section className={cn(!showSection("account") && "hidden")}>
          <p className={sectionLabel}>Session</p>
          <div className="rounded-[12px] border border-brand-accent/20 bg-brand-accent/6 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-text">Sign out of this account</p>
                <p className="mt-1 text-xs text-brand-text/55">
                  End your current session and return to the login screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className={dangerButton}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>

    <ConfirmDialog
      open={deletingArchivedItem !== null}
      onClose={() => setDeletingArchivedItem(null)}
      onConfirm={() => void handleDeleteArchivedItem()}
      title={`Delete ${deletingArchivedItem?.kind ?? "item"}`}
      description={`This will permanently delete "${deletingArchivedItem?.title ?? "Untitled"}". This action cannot be undone.`}
      confirmLabel="Delete"
      isDestructive
      isLoading={isDeletingArchivedItem}
    />
    </>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Account settings" size="lg">
      <SettingsPanel onClose={onClose} />
    </Modal>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-brand-text/45">
        {label}
      </span>
      <span className="flex h-10 items-center gap-2 rounded-[10px] card-whisper bg-brand-bg px-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-8 rounded border-0 bg-transparent p-0"
          aria-label={`${label} color`}
        />
        <span className="font-mono text-xs text-brand-text/60">{value}</span>
      </span>
    </label>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] bg-brand-bg/45 px-3 py-2">
      <span className="text-sm font-medium text-brand-text">{label}</span>
      <kbd className="rounded-lg bg-brand-text/8 px-2 py-1 font-mono text-[11px] font-bold text-brand-text/65">
        {keys}
      </kbd>
    </div>
  );
}

function ArchivedItemRow({
  item,
  isRestoring,
  onRestore,
  onDelete,
}: {
  item: ArchivedItem;
  isRestoring: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon =
    item.kind === "board" ? LayoutGrid : item.kind === "note" ? FileText : PencilLine;
  const typeLabel =
    item.kind === "board" ? "Board" : item.kind === "note" ? "Note" : "Drawing";

  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] card-whisper bg-brand-bg/70 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] bg-brand-primary text-brand-text/55">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-text">{item.title}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-text/40">
            {typeLabel}
            {item.archivedAt
              ? ` - ${new Date(item.archivedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] border border-brand-text/12 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/60 transition-colors hover:border-brand-text/30 hover:text-brand-text disabled:opacity-60"
        >
          {isRestoring ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Restore
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-brand-accent transition-colors hover:bg-brand-accent/10"
          title="Delete permanently"
          aria-label="Delete permanently"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

