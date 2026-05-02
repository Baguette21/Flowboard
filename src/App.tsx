import { Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { HomePage } from "./pages/HomePage";
import { PlanPage } from "./pages/PlanPage";
import { NotesPage } from "./pages/NotesPage";
import { DrawPage } from "./pages/DrawPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { JoinBoardPage } from "./pages/JoinBoardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { LoginPage } from "./components/auth/LoginPage";
import { ForgotPasswordPage } from "./components/auth/ForgotPasswordPage";
import { PlanthingLoading } from "./components/branding/PlanthingLoading";

function AuthScreen({ message }: { message: string }) {
  return (
    <div className="h-screen w-full bg-brand-bg flex items-center justify-center">
      <PlanthingLoading message={message} />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <AuthScreen message="Loading PlanThing..." />;
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

function PlanRoute() {
  const { planId } = useParams<{ planId: string }>();
  return <PlanPage key={planId} />;
}

function LegacyBoardRedirect() {
  const { planId } = useParams<{ planId: string }>();
  return <Navigate to={planId ? `/plan/${planId}` : "/"} replace />;
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
        path="/profile"
        element={
          <AuthGuard>
            <ProfilePage />
          </AuthGuard>
        }
      />
      <Route
        path="/feedback"
        element={
          <AuthGuard>
            <FeedbackPage />
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
        path="/plan/:planId"
        element={
          <AuthGuard>
            <PlanRoute />
          </AuthGuard>
        }
      />
      <Route
        path="/board/:planId"
        element={
          <AuthGuard>
            <LegacyBoardRedirect />
          </AuthGuard>
        }
      />
      <Route path="/join/:token" element={<JoinBoardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
