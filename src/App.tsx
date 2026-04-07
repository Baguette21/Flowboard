import { Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { HomePage } from "./pages/HomePage";
import { BoardPage } from "./pages/BoardPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./components/auth/LoginPage";

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

  if (isLoading) {
    return <AuthScreen message="Checking your session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
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
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/board/:boardId"
        element={
          <AuthGuard>
            <BoardPage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
