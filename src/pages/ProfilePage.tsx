import { useEffect, useRef, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Camera,
  FileText,
  LayoutGrid,
  Loader2,
  Moon,
  PencilLine,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { SettingsPanel } from "../components/auth/SettingsModal";
import { UserAvatar } from "../components/ui/UserAvatar";
import { useProfileAvatar } from "../hooks/useProfileAvatar";
import { usePrivacyMode } from "../hooks/usePrivacyMode";
import { useTheme } from "../hooks/useTheme";
import { convertToWebP } from "../lib/image";
import { cn } from "../lib/utils";

type ProfileTab = "account" | "privacy" | "customization" | "archive" | "shortcuts";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "privacy", label: "Privacy" },
  { id: "customization", label: "Customization" },
  { id: "archive", label: "Archive" },
  { id: "shortcuts", label: "Shortcuts" },
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function ProfilePage() {
  const navigate = useNavigate();
  const convex = useConvex();
  const { signOut } = useAuthActions();
  const { toggle } = useTheme();
  const { name, email, imageKey, imageUrl, role } = useProfileAvatar();
  const { enabled: privacyMode } = usePrivacyMode();
  const boards = useQuery(api.boards.list);
  const notes = useQuery(api.notes.list);
  const drawings = useQuery(api.drawings.list);
  const setProfileImageKey = useMutation(api.users.setProfileImageKey);
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoadingCounts =
    boards === undefined || notes === undefined || drawings === undefined;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleAvatarFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!original) return;

    if (!original.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (original.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    const file = await convertToWebP(original);

    const preview = URL.createObjectURL(file);
    setLocalPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return preview;
    });
    setIsUploadingAvatar(true);

    try {
      const { key, uploadUrl } = await convex.action(
        api.r2.createProfileImageUploadUrl,
        {
          fileName: file.name,
          contentType: file.type,
        },
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { previousKey } = await setProfileImageKey({ imageKey: key });
      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, {
            key: previousKey,
          });
        } catch (error) {
          console.warn("Failed to remove old profile image", error);
        }
      }

      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload image");
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!imageKey) return;
    setIsDeletingAvatar(true);
    try {
      const { previousKey } = await setProfileImageKey({ imageKey: null });
      if (previousKey) {
        try {
          await convex.action(api.r2.deleteProfileImageObject, {
            key: previousKey,
          });
        } catch (error) {
          console.warn("Failed to remove old profile image", error);
        }
      }
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      toast.success("Profile picture removed");
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-brand-bg text-brand-text">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-10">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-bold text-brand-text/65 transition-colors hover:bg-brand-text/5 hover:text-brand-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Planthing
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="group relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleAvatarFileSelected(event)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isDeletingAvatar}
                className="relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-text/30"
                aria-label="Change profile picture"
                title="Change profile picture"
              >
                <UserAvatar
                  name={name}
                  email={email}
                  imageUrl={localPreview ?? imageUrl}
                  size="lg"
                  className={cn(
                    "h-28 w-28 border-brand-text/10 text-5xl",
                    privacyMode && "blur-md",
                  )}
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {isUploadingAvatar || isDeletingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </span>
              </button>
              {imageKey ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={isUploadingAvatar || isDeletingAvatar}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-brand-bg bg-brand-accent text-white opacity-0 shadow-sm transition-opacity hover:bg-brand-accent/90 group-hover:opacity-100"
                  aria-label="Remove profile picture"
                  title="Remove profile picture"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <h1
              className={cn(
                "mt-4 max-w-full truncate text-2xl font-bold",
                privacyMode && "blur-sm",
              )}
            >
              {name ?? "Profile"}
            </h1>
            {email ? (
              <p className="mt-1 max-w-full truncate text-sm text-brand-text/55">
                {email}
              </p>
            ) : null}
            <span className="mt-3 inline-flex rounded-full bg-brand-text/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-brand-text/70">
              {role} Plan
            </span>
          </div>

          <div className="mt-7 rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Planthing apps</h2>
              <Sparkles className="h-4 w-4 text-brand-text/35" />
            </div>
            <div className="space-y-2">
              <AppStat
                icon={<LayoutGrid className="h-4 w-4" />}
                label="Boards"
                value={isLoadingCounts ? "..." : String(boards.length)}
              />
              <AppStat
                icon={<FileText className="h-4 w-4" />}
                label="Notes"
                value={isLoadingCounts ? "..." : String(notes.length)}
              />
              <AppStat
                icon={<PencilLine className="h-4 w-4" />}
                label="Draw"
                value={isLoadingCounts ? "..." : String(drawings.length)}
              />
            </div>
          </div>

          <div className="mt-4 rounded-[12px] bg-brand-primary p-4 card-whisper card-elevation">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Quick controls</h2>
              <Shield className="h-4 w-4 text-brand-text/35" />
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={toggle}
                className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm text-brand-text/70 transition-colors hover:bg-brand-text/5 hover:text-brand-text"
              >
                <span>Toggle theme</span>
                <Moon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold text-brand-accent transition-colors hover:bg-brand-accent/10"
              >
                <span>Sign out</span>
                <span className="text-xs">Exit</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 pb-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-full gap-1 overflow-x-auto rounded-lg bg-brand-primary p-1 card-whisper sm:w-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "h-9 flex-shrink-0 rounded-md px-4 text-sm font-bold transition-colors",
                    activeTab === tab.id
                      ? "bg-brand-text text-brand-bg shadow-sm"
                      : "text-brand-text/55 hover:text-brand-text",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="hidden rounded-lg px-3 py-2 text-sm font-bold text-brand-text/65 transition-colors hover:bg-brand-text/5 hover:text-brand-text sm:block"
            >
              Sign out
            </button>
          </div>

          <div>
            <SettingsPanel activeSection={activeTab} />
          </div>
        </main>
      </div>
    </div>
  );
}

function AppStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-brand-bg/65 px-3 py-2">
      <div className="flex items-center gap-2 text-brand-text/65">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="font-mono text-xs text-brand-text/45">
        {value}
      </span>
    </div>
  );
}
