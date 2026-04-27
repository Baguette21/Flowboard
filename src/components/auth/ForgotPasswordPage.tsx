import { useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useTheme } from "../../hooks/useTheme";

const fieldShellClass =
  "group flex h-14 items-center rounded-[2rem] border-2 border-brand-text/15 bg-brand-primary/90 px-5 shadow-[0_12px_30px_rgba(17,17,17,0.03)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-brand-text/35 focus-within:border-brand-text/45 focus-within:bg-brand-primary focus-within:shadow-[0_0_0_4px_rgba(17,17,17,0.06)]";

const textInputClass =
  "h-full w-full bg-transparent text-[15px] text-brand-text placeholder:text-brand-text/35 focus:outline-none";

const primaryButtonClass =
  "flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[2rem] bg-brand-text font-mono text-sm font-bold text-brand-bg transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_18px_28px_rgba(17,17,17,0.14)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none";

const secondaryButtonClass =
  "flex h-14 w-full cursor-pointer items-center justify-center rounded-[2rem] border-2 border-brand-text/15 bg-brand-primary/80 font-mono text-sm font-bold text-brand-text transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-brand-text/40 hover:bg-brand-primary hover:shadow-[0_14px_24px_rgba(17,17,17,0.06)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    if (error.message === "Invalid code") {
      return "The reset code is invalid or expired.";
    }

    if (error.message === "PasswordResetDeliveryFailed") {
      return "We couldn't send the reset email right now. Please try again once email delivery is fixed.";
    }

    return error.message;
  }

  return "Password reset failed. Please try again.";
}

export function ForgotPasswordPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const otpDigits = useMemo(
    () => Array.from({ length: 6 }, (_, index) => verificationCode[index] ?? ""),
    [verificationCode],
  );

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn("password", {
        flow: "reset",
        email,
      });
    } catch (error) {
      console.error("Password reset request failed", error);
    } finally {
      setAwaitingVerification(true);
      setVerificationCode("");
      toast.success(
        `A verification email was sent if an account exists for ${email}.`,
      );
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

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

      toast.success("Password updated.");
      navigate("/");
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      await signIn("password", {
        flow: "reset",
        email,
      });
      toast.success(`New reset code sent to ${email}.`);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-brand-bg flex">
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-2xl border border-brand-text/10 bg-brand-primary/85 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-brand-text transition-colors hover:bg-brand-primary sm:right-6 sm:top-6"
      >
        {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-dark p-12 text-brand-bg">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-brand-accent" />
          <span className="font-serif italic font-bold text-2xl tracking-tight leading-none pt-1">
            Planthing<span className="text-brand-accent">.</span>
          </span>
        </div>

        <div>
          <blockquote className="font-serif italic text-4xl font-bold leading-tight mb-6 text-brand-primary">
            "Reset access.<br />Keep moving."
          </blockquote>
          <p className="font-mono text-sm text-brand-bg/50 uppercase tracking-widest">
            OTP-based password recovery
          </p>
        </div>

        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded bg-brand-accent" />
            <span className="font-serif italic font-bold text-xl tracking-tight leading-none pt-1">
              Planthing<span className="text-brand-accent">.</span>
            </span>
          </div>

          <h2 className="text-3xl font-bold font-serif italic mb-1">
            {awaitingVerification ? "Reset your password" : "Forgot password"}
          </h2>
          <p className="text-brand-text/60 font-mono text-sm mb-8">
            {awaitingVerification
              ? `Enter the code sent to ${email} and choose a new password`
              : "Enter your account email and we will send a reset code"}
          </p>

          <form
            onSubmit={awaitingVerification ? handleResetPassword : handleRequestReset}
            className="space-y-4"
          >
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                Email
              </label>
              <div
                className={cn(
                  fieldShellClass,
                  awaitingVerification && "bg-brand-primary/70",
                )}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email"
                  required
                  readOnly={awaitingVerification}
                  className={cn(
                    textInputClass,
                    "font-sans",
                    awaitingVerification &&
                      "cursor-default text-brand-text/65 selection:bg-brand-text/10",
                  )}
                />
              </div>
            </div>

            {awaitingVerification && (
              <>
                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                    Reset Code
                  </label>
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
                      required
                      autoComplete="one-time-code"
                      aria-label="Reset code"
                      className="absolute inset-0 z-10 cursor-pointer opacity-0 focus:outline-none"
                    />
                    <div
                      className={cn(
                        fieldShellClass,
                        "group-focus-within:border-brand-text/45 group-focus-within:bg-brand-primary group-focus-within:shadow-[0_0_0_4px_rgba(17,17,17,0.06)]",
                        "grid grid-cols-6 gap-2 px-3.5",
                      )}
                    >
                      {otpDigits.map((digit, index) => {
                        const isActive =
                          verificationCode.length < 6 &&
                          index === verificationCode.length;

                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex h-11 items-center justify-center rounded-[1.35rem] border border-brand-text/10 bg-brand-bg/70 font-mono text-lg font-bold tabular-nums transition-colors",
                              digit
                                ? "border-brand-text/25 text-brand-text"
                                : "text-brand-text/22",
                              isActive &&
                                "border-brand-text/40 bg-brand-bg shadow-[0_0_0_2px_rgba(17,17,17,0.06)]",
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
                  <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                    New Password
                  </label>
                  <div className={fieldShellClass}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className={cn(textInputClass, "font-sans")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                    Confirm Password
                  </label>
                  <div className={fieldShellClass}>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat new password"
                      required
                      className={cn(textInputClass, "font-sans")}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-brand-accent font-mono text-xs bg-brand-accent/10 border border-brand-accent/20 px-4 py-2 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={primaryButtonClass}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {awaitingVerification ? "Change Password" : "Send Reset Code"}
            </button>
          </form>

          {awaitingVerification ? (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => void handleResendCode()}
                disabled={isLoading}
                className={secondaryButtonClass}
              >
                Send Another Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setAwaitingVerification(false);
                  setVerificationCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
                disabled={isLoading}
                className="w-full cursor-pointer text-center font-mono text-sm text-brand-text/60 transition-colors hover:text-brand-text disabled:cursor-not-allowed"
              >
                Back
              </button>
            </div>
          ) : (
            <p className="text-center font-mono text-sm text-brand-text/60 mt-6">
              Remembered it?{" "}
              <Link
                to="/login"
                className="cursor-pointer text-brand-text font-bold underline underline-offset-2 transition-colors hover:text-brand-accent"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
