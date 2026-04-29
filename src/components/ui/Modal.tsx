import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "drawer";
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const isDrawer = size === "drawer";

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    drawer: "max-w-md",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 flex overflow-hidden",
        isDrawer
          ? "items-stretch justify-end"
          : "items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4",
      )}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-brand-text/40 backdrop-blur-sm",
          isDrawer && "task-panel-backdrop",
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          isDrawer
            ? "chat-drawer-slide relative flex h-full w-full flex-col overflow-hidden bg-brand-bg border-l-2 border-brand-text/10 shadow-2xl sm:rounded-l-[2rem] sm:border-y-2"
            : "relative my-auto flex w-full max-h-[calc(100vh-1.5rem)] flex-col overflow-hidden bg-brand-bg border-2 border-brand-text/10 rounded-[1.5rem] shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-[2rem]",
          sizeClasses[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex flex-shrink-0 items-center justify-between border-b-2 border-brand-text/10 px-6 py-5">
            <h2 className="font-serif italic font-bold text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-brand-text/10 transition-colors text-brand-text/50 hover:text-brand-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-brand-text/10 transition-colors text-brand-text/50 hover:text-brand-text z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div
          className={cn(
            "min-h-0 flex-1",
            isDrawer ? "flex flex-col overflow-hidden" : "overflow-y-auto overscroll-contain",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
