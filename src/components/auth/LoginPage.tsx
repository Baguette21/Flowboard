import { useMemo, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../hooks/useTheme";

type Flow = "signIn" | "signUp";

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
    if (
      error.message.includes("Server Error") ||
      error.message.includes("Uncaught Error:") ||
      error.message.includes("[CONVEX")
    ) {
      return "We couldn't complete sign-up right now. Please try again in a moment.";
    }

    if (error.message === "InvalidAccountId") {
      return "Invalid username";
    }

    if (error.message === "InvalidSecret" || error.message === "Invalid credentials") {
      return "Invalid password";
    }

    if (error.message === "EmailDeliveryFailed") {
      return "We couldn't send the verification email right now. Please try again once email delivery is fixed.";
    }

    return error.message;
  }

  return "Authentication failed. Please try again.";
}

export function LoginPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const otpDigits = useMemo(
    () => Array.from({ length: 6 }, (_, index) => verificationCode[index] ?? ""),
    [verificationCode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (flow === "signUp" && !awaitingVerification) {
        try {
          const result = await signIn("password", {
            email,
            password,
            flow: "signIn",
          });

          if (!result.signingIn) {
            setAwaitingVerification(true);
            setVerificationCode("");
            toast.success(`Verification code sent to ${email}.`);
            return;
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "";

          if (message === "InvalidAccountId") {
            // No password account exists yet, continue with sign-up.
          } else if (
            message === "Invalid credentials" ||
            message === "InvalidSecret"
          ) {
            throw new Error("There is already an existing user with that email");
          } else {
            throw error;
          }
        }
      }

      if (awaitingVerification) {
        const result = await signIn("password", {
          flow: "email-verification",
          email,
          code: verificationCode.trim(),
        });

        if (!result.signingIn) {
          throw new Error("Invalid verification code");
        }

        navigate("/");
        toast.success("Email verified.");
        return;
      }

      const params: Record<string, string> = { email, password, flow };
      if (flow === "signUp" && name.trim()) {
        params.name = name.trim();
      }

      const result = await signIn("password", params);
      if (!result.signingIn) {
        setAwaitingVerification(true);
        setVerificationCode("");
        toast.success(`Verification code sent to ${email}.`);
        return;
      }

      navigate("/");
      toast.success(flow === "signIn" ? "Welcome back." : "Account created.");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      const params: Record<string, string> = { email, password, flow };
      if (flow === "signUp" && name.trim()) {
        params.name = name.trim();
      }

      await signIn("password", params);
      toast.success(`New verification code sent to ${email}.`);
    } catch (error: unknown) {
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

      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-dark p-12 text-brand-sidebar-text">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-brand-accent" />
          <span className="font-serif italic font-bold text-2xl tracking-tight leading-none pt-1">
            FlowBoard<span className="text-brand-accent">.</span>
          </span>
        </div>

        <div>
          <blockquote className="font-serif italic text-4xl font-bold leading-tight mb-6 text-brand-sidebar-text/80">
            Track progress without losing focus.
          </blockquote>
          <p className="font-mono text-sm text-brand-sidebar-text/50 uppercase tracking-widest">
            Kanban built for focused work
          </p>
        </div>

        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded bg-brand-accent" />
            <span className="font-serif italic font-bold text-xl tracking-tight leading-none pt-1">
              FlowBoard<span className="text-brand-accent">.</span>
            </span>
          </div>

          <h2 className="text-3xl font-bold font-serif italic mb-1">
            {awaitingVerification
              ? "Check your email"
              : flow === "signIn"
                ? "Welcome back"
                : "Create account"}
          </h2>
          <p className="text-brand-text/60 font-mono text-sm mb-8">
            {awaitingVerification
              ? `Enter the code sent to ${email}`
              : flow === "signIn"
                ? "Sign in to access your boards"
                : "Create your account with a verified email"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {flow === "signUp" && !awaitingVerification && (
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                  Full Name
                </label>
                <div className={fieldShellClass}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    required={flow === "signUp"}
                    className={cn(textInputClass, "font-sans")}
                  />
                </div>
              </div>
            )}

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
                  onChange={(e) => setEmail(e.target.value)}
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

            {awaitingVerification ? (
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                  Verification Code
                </label>
                <div className="group relative">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    aria-label="Verification code"
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
            ) : (
              <div>
                <label className="block font-mono text-xs uppercase tracking-widest text-brand-text/60 mb-1.5">
                  Password
                </label>
                <div className={cn(fieldShellClass, "pr-3")}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className={cn(textInputClass, "pr-4 font-sans")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-brand-text/40 transition-colors hover:bg-brand-text/6 hover:text-brand-text"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {flow === "signIn" && (
                  <div className="mt-2 text-right">
                    <Link
                      to="/forgot-password"
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-text/45 transition-colors hover:text-brand-accent"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>
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
              {awaitingVerification
                ? "Verify Email"
                : flow === "signIn"
                  ? "Sign In"
                  : "Create Account"}
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
              {flow === "signIn" ? "No account yet?" : "Already have one?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                  setError("");
                  setVerificationCode("");
                  setAwaitingVerification(false);
                }}
                className="cursor-pointer text-brand-text font-bold underline underline-offset-2 transition-colors hover:text-brand-accent"
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
