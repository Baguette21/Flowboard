import { cn } from "../../lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  variant?: "solid" | "outline" | "soft";
}

export function Badge({ children, color, className, variant = "soft" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-widest font-bold",
        variant === "soft" && "bg-brand-text/10 text-brand-text",
        variant === "outline" && "border-2 border-brand-text/20 text-brand-text",
        variant === "solid" && "bg-brand-text text-brand-bg",
        className,
      )}
      style={
        color
          ? variant === "soft"
            ? { backgroundColor: `${color}22`, color }
            : variant === "solid"
              ? { backgroundColor: color, color: "#fff" }
              : { borderColor: color, color }
          : undefined
      }
    >
      {children}
    </span>
  );
}
