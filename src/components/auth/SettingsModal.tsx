import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useMutation } from "convex/react";
import { Loader2, Trash2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/utils";
import { useProfileAvatar } from "../../hooks/useProfileAvatar";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type PasswordStep = "idle" | "awaitingCode";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (error.message === "Invalid code") {
      return "The code is invalid or expired.";
    }
    return error.message;
  }
  return fallback;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const convex = useConvex();
  const { signIn } = useAuthActions();
  const { name, email, imageKey, imageUrl, role } = useProfileAvatar();
  const updateProfile = useMutation(api.users.updateProfile);
  const setProfileImageKey = useMutation(api.users.setProfileImageKey);

  const [draftName, setDraftName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraftName(name ?? "");
    setLocalPreview(null);
    setPasswordStep("idle");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }, [open, name]);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const displayImage = localPreview ?? imageUrl;
  const initial = useMemo(() => {
    const source = (name ?? email ?? "?").trim();
    return source.charAt(0).toUpperCase() || "?";
  }, [name, email]);

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

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return preview;
    });
    setIsUploadingAvatar(true);

    try {
      const { key, uploadUrl } = await convex.action(
        api.r2.createProfileImageUploadUrl,
        {
          fileName: file.name,
          contentType: file.type,
        },
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          `Upload failed (${uploadResponse.status} ${uploadResponse.statusText})`,
        );
      }

      const { previousKey } = await setProfileImageKey({ imageKey: key });

      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, {
            key: previousKey,
          });
        } catch (error) {
          console.warn("Failed to remove old profile image", error);
        }
      }

      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload image"));
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!imageKey) return;
    setIsDeletingAvatar(true);
    try {
      const { previousKey } = await setProfileImageKey({ imageKey: null });
      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, {
            key: previousKey,
          });
        } catch (error) {
          console.warn("Failed to remove old profile image", error);
        }
      }
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove image"));
    } finally {
      setIsDeletingAvatar(false);
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

  const otpDigits = useMemo(
    () => Array.from({ length: 6 }, (_, index) => verificationCode[index] ?? ""),
    [verificationCode],
  );

  const sectionLabel =
    "mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-brand-text/45";
  const fieldLabel =
    "mb-1.5 block font-mono text-xs uppercase tracking-widest text-brand-text/60";
  const inputClass =
    "h-11 w-full rounded-[14px] border-2 border-brand-text/15 bg-brand-primary/85 px-4 font-sans text-sm text-brand-text placeholder:text-brand-text/35 transition-colors focus:border-brand-text/45 focus:outline-none";
  const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-[14px] bg-brand-text px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-bg transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryButton =
    "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-brand-text/15 bg-brand-primary/70 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-text transition-colors hover:border-brand-text/40 hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
  const dangerButton =
    "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-brand-accent/25 bg-brand-accent/8 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-brand-accent transition-colors hover:bg-brand-accent/15 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <Modal open={open} onClose={onClose} title="Account settings" size="lg">
      <div className="space-y-8 px-6 py-6">
        <section>
          <p className={sectionLabel}>Account</p>
          <div className="rounded-[18px] border-2 border-brand-text/10 bg-brand-primary/70 p-4">
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

        <div className="h-px bg-brand-text/8" />

        <section>
          <p className={sectionLabel}>Profile picture</p>
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-brand-text/10 bg-brand-primary">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-accent text-white">
                  <span className="font-serif text-2xl font-bold">
                    {initial}
                  </span>
                </div>
              )}
              {(isUploadingAvatar || isDeletingAvatar) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleFileSelected(event)}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={isUploadingAvatar || isDeletingAvatar}
                  className={secondaryButton}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {imageKey ? "Replace" : "Upload"}
                </button>
                {imageKey && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={isUploadingAvatar || isDeletingAvatar}
                    className={dangerButton}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <p className="font-mono text-[11px] text-brand-text/45">
                PNG, JPG, or GIF. 5 MB max.
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-brand-text/8" />

        <section>
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

        <div className="h-px bg-brand-text/8" />

        <section>
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
                  <div className="grid h-11 grid-cols-6 gap-1.5 rounded-[14px] border-2 border-brand-text/15 bg-brand-primary/85 p-1.5 group-focus-within:border-brand-text/45">
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
                <p className="rounded-xl border border-brand-accent/20 bg-brand-accent/10 px-3 py-2 font-mono text-[11px] text-brand-accent">
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
      </div>
    </Modal>
  );
}
