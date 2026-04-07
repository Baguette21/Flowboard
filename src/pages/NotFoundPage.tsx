import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <p className="font-mono text-8xl font-bold text-brand-text/10 mb-4">404</p>
        <h1 className="font-serif italic font-bold text-3xl mb-2">
          Page not found
        </h1>
        <p className="text-brand-text/50 font-mono text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-6 py-3 bg-brand-text text-brand-bg rounded-2xl font-mono font-bold text-sm hover:bg-brand-dark transition-colors mx-auto"
        >
          <Home className="w-4 h-4" />
          Back home
        </button>
      </div>
    </div>
  );
}
