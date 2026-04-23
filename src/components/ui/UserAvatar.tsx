import { cn } from "../../lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name?: string | null, email?: string | null) {
  const source = (name ?? email ?? "?").trim();
  return (
    source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function UserAvatar({
  name,
  email,
  imageUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = getInitials(name, email);
  const sizeClass =
    size === "sm"
      ? "h-6 w-6 text-[10px]"
      : size === "lg"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-xs";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name ?? email ?? "User"}
        className={cn(
          "rounded-full border border-brand-text/10 object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-brand-text/10 bg-brand-accent/15 font-bold uppercase text-brand-accent",
        sizeClass,
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
