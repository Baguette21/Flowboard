import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";

export function JoinBoardPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const joinViaLink = useMutation(api.boardInvites.joinViaLink);
  const linkInfo = useQuery(
    api.boardInvites.lookupByToken,
    token ? { token } : "skip",
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token || !isAuthenticated || hasAttempted.current) {
      return;
    }
    hasAttempted.current = true;

    (async () => {
      try {
        const result = await joinViaLink({ token });
        toast.success(
          result.alreadyMember ? "Welcome back to the board." : "You joined the board.",
        );
        navigate(`/board/${result.boardId}`, { replace: true });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message.includes("[CONVEX") || error.message.includes("Uncaught Error:")
              ? "This invite link is no longer active."
              : error.message
            : "We couldn't add you to the board right now.";
        setErrorMessage(message);
      }
    })();
  }, [token, isAuthenticated, joinViaLink, navigate]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-brand-text/60" />
          <p className="font-mono text-sm text-brand-text/60">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(`/join/${token}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return (
    <div className="h-screen w-full bg-brand-bg flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5">
        {errorMessage ? (
          <>
            <h1 className="font-serif italic font-bold text-3xl">Invite unavailable</h1>
            <p className="font-mono text-sm text-brand-text/60">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="h-11 px-6 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors"
            >
              Back to your boards
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand-text/60" />
            </div>
            <h1 className="font-serif italic font-bold text-3xl">
              {linkInfo ? `Joining "${linkInfo.boardName}"…` : "Joining board…"}
            </h1>
            <p className="font-mono text-sm text-brand-text/60">
              Hold tight, we're adding you to the board.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
