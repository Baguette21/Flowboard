import { Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { HomePage } from "./pages/HomePage";
import { BoardPage } from "./pages/BoardPage";
import { NotesPage } from "./pages/NotesPage";
import { DrawPage } from "./pages/DrawPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { JoinBoardPage } from "./pages/JoinBoardPage";
import { LoginPage } from "./components/auth/LoginPage";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";

function AuthScreen({ message }: { message: string }) {
  return (
    <div className="h-screen w-full bg-brand-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded bg-brand-accent animate-pulse" />
        <p className="font-mono text-sm text-brand-text/60">{message}</p>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthScreen message="Loading FlowBoard..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [searchParams] = useSearchParams();

  if (isLoading) {
    return <AuthScreen message="Checking your session..." />;
  }

  if (isAuthenticated) {
    const redirect = searchParams.get("redirect");
    const safeRedirect =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/";
    return <Navigate to={safeRedirect} replace />;
  }

  return <>{children}</>;
}

function BoardRoute() {
  const { boardId } = useParams<{ boardId: string }>();
  return <BoardPage key={boardId} />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        }
      />
      <Route
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/notes"
        element={
          <AuthGuard>
            <NotesPage />
          </AuthGuard>
        }
      />
      <Route
        path="/notes/:noteId"
        element={
          <AuthGuard>
            <NotesPage />
          </AuthGuard>
        }
      />
      <Route
        path="/draw"
        element={
          <AuthGuard>
            <DrawPage />
          </AuthGuard>
        }
      />
      <Route
        path="/draw/:drawingId"
        element={
          <AuthGuard>
            <DrawPage />
          </AuthGuard>
        }
      />
      <Route
        path="/board/:boardId"
        element={
          <AuthGuard>
            <BoardRoute />
          </AuthGuard>
        }
      />
      <Route path="/join/:token" element={<JoinBoardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
