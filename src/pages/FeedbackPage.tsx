import { ArrowLeft, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/layout/Layout";

export function FeedbackPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-6 sm:px-8 sm:py-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-brand-text/60 transition-colors hover:bg-brand-text/5 hover:text-brand-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-[1.5rem] border-2 border-brand-text/10 bg-brand-bg p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-text/6 text-brand-text/55">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold">Feedback</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-brand-text/55">
              This page is ready for the feedback flow when you add it later.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
