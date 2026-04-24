import { useState } from "react";
import { SettingsModal } from "./SettingsModal";
import { useProfileAvatar } from "../../hooks/useProfileAvatar";
import { UserAvatar } from "../ui/UserAvatar";

export function UserMenu() {
  const { name, email, imageUrl } = useProfileAvatar();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="rounded-full shadow-md hover:scale-105 transition-transform"
        title="Profile settings"
        aria-label="Open profile settings"
      >
        <UserAvatar
          name={name}
          email={email}
          imageUrl={imageUrl}
          size="md"
          className="h-8 w-8 border-white/20"
        />
      </button>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
