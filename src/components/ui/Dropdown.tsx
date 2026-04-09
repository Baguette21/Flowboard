import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const handleTriggerClick = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 6,
      left: align === "right"
        ? rect.right + window.scrollX
        : rect.left + window.scrollX,
    });
    setOpen(!open);
  };

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick} className="inline-flex">
        {trigger}
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-[100] bg-brand-primary border border-brand-text/12 rounded-md shadow-xl overflow-hidden py-1 min-w-[180px]",
              className,
            )}
            style={{
              top: position.top,
              ...(align === "right"
                ? { right: `calc(100vw - ${position.left}px)` }
                : { left: position.left }),
            }}
          >
            {items.map((item, i) => (
              <div key={i}>
                {item.separator && i > 0 && (
                  <div className="h-px bg-brand-text/10 my-1" />
                )}
                <button
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick();
                    setOpen(false);
                  }}
                  disabled={item.disabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
                    item.danger
                      ? "text-brand-accent hover:bg-brand-accent/10"
                      : "text-brand-text hover:bg-brand-bg",
                    item.disabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {item.icon && (
                    <span className="text-brand-text/50">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
