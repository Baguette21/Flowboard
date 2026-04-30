import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useConvex, useMutation } from "convex/react";
import {
  ArrowLeft,
  Bug,
  Lightbulb,
  Plug,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/utils";

type FeedbackCategory =
  | "feature"
  | "improvement"
  | "bug"
  | "integration"
  | "other";

type FeedbackTab = "request" | "history";

const categories: Array<{
  value: FeedbackCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "feature",
    label: "New feature",
    description: "A new workflow, view, field, or capability.",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    value: "improvement",
    label: "Improvement",
    description: "A change that makes an existing feature better.",
    icon: <Wrench className="h-4 w-4" />,
  },
  {
    value: "bug",
    label: "Bug fix",
    description: "Something that is broken or behaves incorrectly.",
    icon: <Bug className="h-4 w-4" />,
  },
  {
    value: "integration",
    label: "Integration",
    description: "A connection to another app or service.",
    icon: <Plug className="h-4 w-4" />,
  },
  {
    value: "other",
    label: "Other",
    description: "Anything that does not fit the categories above.",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to submit feedback";
}

export function FeedbackPage() {
  const navigate = useNavigate();
  const convex = useConvex();
  const submitFeedback = useMutation(api.feedback.submit);
  const [activeTab, setActiveTab] = useState<FeedbackTab>("request");
  const [feedback, setFeedback] = useState<Array<Doc<"feedback">>>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCategory("feature");
    setTitle("");
    setDetails("");
  };

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    let cancelled = false;
    setIsLoadingFeedback(true);
    setFeedbackError(null);

    void convex
      .query(api.feedback.listMine, {})
      .then((items) => {
        if (cancelled) {
          return;
        }
        setFeedback(items);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setFeedbackError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingFeedback(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, convex]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Add a short feature title");
      return;
    }

    if (!details.trim()) {
      toast.error("Describe what you want implemented");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback({ category, title, details });
      toast.success("Feedback submitted");
      resetForm();
      setActiveTab("history");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-brand-bg text-brand-text">
      <div className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-brand-text/65 transition-colors hover:bg-brand-text/5 hover:text-brand-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PlanThing
          </button>
        </div>

        <main className="min-w-0 pb-10">
          <div className="mb-8">
            <div className="inline-flex w-full gap-1 overflow-x-auto rounded-lg bg-brand-primary p-1 card-whisper sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("request")}
                className={cn(
                  "h-9 flex-shrink-0 rounded-md px-4 text-sm font-bold transition-colors",
                  activeTab === "request"
                    ? "bg-brand-text text-brand-bg shadow-sm"
                    : "text-brand-text/55 hover:text-brand-text",
                )}
              >
                Request
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "h-9 flex-shrink-0 rounded-md px-4 text-sm font-bold transition-colors",
                  activeTab === "history"
                    ? "bg-brand-text text-brand-bg shadow-sm"
                    : "text-brand-text/55 hover:text-brand-text",
                )}
              >
                History
              </button>
            </div>
          </div>

          {activeTab === "request" ? (
            <div className="rounded-[12px] bg-brand-primary card-whisper card-elevation">
              <div className="border-b border-brand-text/8 px-5 py-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-text/38">
                  request
                </p>
                <h2 className="mt-1 text-2xl font-bold">Feature request</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 p-5">
                <div>
                  <label className="text-sm font-bold" htmlFor="feedback-title">
                    Feature title
                  </label>
                  <input
                    id="feedback-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                    className="mt-2 h-11 w-full rounded-lg border border-brand-text/10 bg-brand-bg/65 px-3 text-sm outline-none transition-colors placeholder:text-brand-text/35 focus:border-brand-text/35"
                    placeholder="Example: Recurring tasks"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold">Category</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {categories.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setCategory(item.value)}
                        className={cn(
                          "rounded-lg border p-4 text-left transition-colors",
                          category === item.value
                            ? "border-brand-text bg-brand-text text-brand-bg"
                            : "border-brand-text/10 bg-brand-bg/65 text-brand-text hover:border-brand-text/25",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="text-sm font-bold">{item.label}</span>
                        </div>
                        <p
                          className={cn(
                            "mt-2 text-sm leading-5",
                            category === item.value
                              ? "text-brand-bg/70"
                              : "text-brand-text/55",
                          )}
                        >
                          {item.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold" htmlFor="feedback-details">
                    What should be implemented?
                  </label>
                  <textarea
                    id="feedback-details"
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    maxLength={4000}
                    rows={8}
                    className="mt-2 w-full resize-none rounded-lg border border-brand-text/10 bg-brand-bg/65 px-3 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-brand-text/35 focus:border-brand-text/35"
                    placeholder="Describe the workflow, expected behavior, and why it matters."
                  />
                </div>

                <div className="flex justify-end border-t border-brand-text/8 pt-5">
                  <Button type="submit" isLoading={isSubmitting} className="gap-2">
                    <Send className="h-4 w-4" />
                    Submit feedback
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-[12px] bg-brand-primary card-whisper card-elevation">
              <div className="border-b border-brand-text/8 px-5 py-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-text/38">
                  history
                </p>
                <h2 className="mt-1 text-2xl font-bold">Feedback history</h2>
              </div>
              <div className="space-y-2 p-5">
                {isLoadingFeedback ? (
                  <p className="text-sm text-brand-text/55">
                    Loading feedback...
                  </p>
                ) : feedbackError ? (
                  <div className="rounded-lg bg-brand-bg/65 px-4 py-3">
                    <h3 className="text-sm font-bold">Could not load history</h3>
                    <p className="mt-2 text-sm leading-6 text-brand-text/55">
                      {feedbackError}
                    </p>
                  </div>
                ) : feedback.length === 0 ? (
                  <p className="text-sm text-brand-text/55">
                    No feedback submitted yet.
                  </p>
                ) : (
                  feedback.map((item) => (
                    <article
                      key={item._id}
                      className="rounded-lg bg-brand-bg/65 px-4 py-3"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-bold">{item.title}</h3>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/38">
                          {item.category} / {item.status}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-brand-text/55">
                        {item.details}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-[12px] bg-brand-primary card-whisper card-elevation">
            <div className="border-b border-brand-text/8 px-5 py-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-brand-text/38">
                status
              </p>
              <h2 className="mt-1 text-2xl font-bold">How requests are handled</h2>
            </div>
            <div className="space-y-2 p-5">
              <div className="rounded-lg bg-brand-bg/65 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold">Submitted to feedback</h3>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-text/38">
                    new / reviewing / planned
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-brand-text/55">
                  Feature requests are saved to the feedback database with your
                  selected category and start in the new state.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
