import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Loader2,
  Maximize2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { Modal } from "../ui/Modal";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

interface CardImageGalleryProps {
  cardId: Id<"cards">;
  skipInitialLoad?: boolean;
  embedded?: boolean;
}

type AttachmentItem = {
  _id: Id<"cardAttachments">;
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function CardImageGallery({
  cardId,
  skipInitialLoad = false,
  embedded = false,
}: CardImageGalleryProps) {
  const convex = useConvex();
  const inputRef = useRef<HTMLInputElement>(null);
  const pasteSurfaceRef = useRef<HTMLDivElement>(null);

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(!skipInitialLoad);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"cardAttachments"> | null>(null);
  const [isPasteActive, setIsPasteActive] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<Id<"cardAttachments"> | null>(null);

  const attachmentSignature = useMemo(
    () =>
      attachments
        .map((attachment) => `${attachment._id}:${attachment.key}:${attachment.mimeType}`)
        .join("|"),
    [attachments],
  );

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextAttachments = await convex.query(api.cardAttachments.listByCard, {
        cardId,
      });
      setAttachments(
        nextAttachments.map((attachment) => ({
          _id: attachment._id,
          key: attachment.key,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          size: attachment.size,
        })),
      );
    } catch (error) {
      console.error("Failed to load task images", error);
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  }, [cardId, convex]);

  useEffect(() => {
    if (skipInitialLoad) {
      setIsLoading(false);
      return;
    }

    void loadAttachments();
  }, [loadAttachments, skipInitialLoad]);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateUrls() {
      if (attachments.length === 0) {
        setImageUrls((current) =>
          Object.keys(current).length === 0 ? current : {},
        );
        return;
      }

      const nextEntries = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const result = await convex.action(api.r2.getDownloadUrl, {
              attachmentId: attachment._id,
            });
            return [attachment._id, result.url] as const;
          } catch (error) {
            console.error("Failed to get image URL", error);
            return [attachment._id, ""] as const;
          }
        }),
      );

      if (isCancelled) {
        return;
      }

      setImageUrls((current) => {
        const next: Record<string, string> = {};
        for (const [attachmentId, url] of nextEntries) {
          if (url) {
            next[attachmentId] = url;
          } else if (current[attachmentId]) {
            next[attachmentId] = current[attachmentId];
          }
        }

        const currentKeys = Object.keys(current);
        const nextKeys = Object.keys(next);
        if (
          currentKeys.length === nextKeys.length &&
          nextKeys.every((key) => current[key] === next[key])
        ) {
          return current;
        }

        return next;
      });
    }

    void hydrateUrls();

    return () => {
      isCancelled = true;
    };
  }, [attachmentSignature, attachments, convex]);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const uploadFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
      toast.error("Only image files can be uploaded");
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedFile) {
      toast.error("Images must be 10 MB or smaller");
      return;
    }

    setIsUploading(true);

    try {
      for (const file of files) {
        const localPreviewUrl = URL.createObjectURL(file);
        let key = "";
        let uploadUrl = "";

        try {
          const result = await convex.action(api.r2.createUploadUrl, {
            cardId,
            fileName: file.name,
            contentType: file.type,
          });
          key = result.key;
          uploadUrl = result.uploadUrl;
        } catch (error) {
          throw new Error(
            `Could not create upload URL: ${getErrorMessage(error)}`,
          );
        }

        let uploadResponse: Response;
        try {
          uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });
        } catch (error) {
          throw new Error(
            `Browser upload failed. This is usually bucket CORS for ${window.location.origin}. Original error: ${getErrorMessage(error)}`,
          );
        }

        if (!uploadResponse.ok) {
          const responseText = await uploadResponse.text().catch(() => "");
          throw new Error(
            `R2 upload failed (${uploadResponse.status} ${uploadResponse.statusText})${responseText ? `: ${responseText.slice(0, 220)}` : ""}`,
          );
        }

        let attachmentId: Id<"cardAttachments">;
        try {
          attachmentId = await convex.mutation(api.cardAttachments.create, {
            cardId,
            key,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          });
        } catch (error) {
          throw new Error(
            `Upload reached R2 but saving the task image failed: ${getErrorMessage(error)}`,
          );
        }

        setAttachments((current) => [
          {
            _id: attachmentId,
            key,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
          ...current.filter((attachment) => attachment._id !== attachmentId),
        ]);
        setImageUrls((current) => ({
          ...current,
          [attachmentId]: localPreviewUrl,
        }));
      }

      toast.success(files.length === 1 ? "Image uploaded" : "Images uploaded");
    } catch (error) {
      console.error("Failed to upload image", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }, [cardId, convex]);

  const handleFilesSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await uploadFiles(files);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    await uploadFiles(files);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsPasteActive(false);

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    await uploadFiles(files);
  };

  const handleDelete = async (attachmentId: Id<"cardAttachments">) => {
    setDeletingId(attachmentId);

    try {
      await convex.action(api.r2.deleteObject, { attachmentId });
      await convex.mutation(api.cardAttachments.remove, { attachmentId });
      setAttachments((current) =>
        current.filter((attachment) => attachment._id !== attachmentId),
      );
      setImageUrls((current) => {
        const next = { ...current };
        delete next[attachmentId];
        return next;
      });
      toast.success("Image removed");
    } catch (error) {
      console.error("Failed to remove image", error);
      toast.error("Failed to remove image");
    } finally {
      setDeletingId(null);
    }
  };

  const activeAttachment = activePreviewId
    ? attachments.find((attachment) => attachment._id === activePreviewId) ?? null
    : null;
  const activePreviewUrl = activeAttachment ? imageUrls[activeAttachment._id] ?? "" : "";

  return (
    <div className={embedded ? "" : "border-b border-brand-text/8 px-8 py-6"}>
      {!embedded && (
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-brand-text/40">
          Images
        </h3>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div
        ref={pasteSurfaceRef}
        tabIndex={0}
        onPaste={(event) => void handlePaste(event)}
        onDragEnter={() => setIsPasteActive(true)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isPasteActive) {
            setIsPasteActive(true);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          setIsPasteActive(false);
        }}
        onDrop={(event) => void handleDrop(event)}
        className={cn(
          embedded
            ? "min-h-[120px] rounded-[12px] border border-dashed border-brand-text/10 bg-transparent px-0 py-2 outline-none transition-colors"
            : "mt-4 min-h-[180px] rounded-[12px] border border-dashed border-brand-text/10 bg-transparent px-5 py-5 outline-none transition-colors",
          isPasteActive && "border-brand-text/28 bg-brand-primary/18",
          isUploading && "opacity-80",
        )}
        onClick={() => pasteSurfaceRef.current?.focus()}
      >
        {isLoading ? (
          <div className="flex min-h-[170px] items-center justify-center text-brand-text/30">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
        ) : attachments.length === 0 ? (
          <div className={cn("flex flex-col justify-center", embedded ? "min-h-[110px]" : "min-h-[170px]")}>
            <p className={cn("font-serif font-bold leading-none text-brand-text", embedded ? "text-[22px]" : "text-[26px]")}>
              Paste an image
            </p>
            <p className="mt-3 max-w-lg font-mono text-[12px] leading-6 text-brand-text/30">
              Drop a screenshot here or press{" "}
              <span className="text-brand-text/52">Ctrl+V</span> /{" "}
              <span className="text-brand-text/52">Cmd+V</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {attachments.map((attachment) => {
              const previewUrl = imageUrls[attachment._id];
              const isDeleting = deletingId === attachment._id;

              return (
                <div
                  key={attachment._id}
                  className="group overflow-hidden rounded-[12px] border border-brand-text/8 bg-brand-primary/14"
                >
                  <div className="relative overflow-hidden bg-brand-text/4">
                    {previewUrl ? (
                      <button
                        type="button"
                        onClick={() => setActivePreviewId(attachment._id)}
                        className="block w-full cursor-zoom-in"
                        title="Open larger preview"
                      >
                        <img
                          src={previewUrl}
                          alt={attachment.fileName}
                          className="max-h-[420px] w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      </button>
                    ) : (
                      <div className="flex h-44 items-center justify-center text-brand-text/30">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}

                    <div className="absolute right-3 top-3 flex items-center gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      {previewUrl ? (
                        <button
                          type="button"
                          onClick={() => setActivePreviewId(attachment._id)}
                          className="inline-flex items-center gap-1.5 rounded-[9px] bg-black/55 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-black/70"
                          title="Open larger preview"
                        >
                          <Maximize2 className="h-3 w-3" />
                          Preview
                        </button>
                      ) : (
                        <span className="rounded-[9px] bg-black/45 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/72">
                          Preparing
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(attachment._id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#E63B2E]/88 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#E63B2E] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-brand-text/8 px-4 py-3">
                    <p className="truncate font-mono text-[11px] text-brand-text/30">
                      {attachment.fileName}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="pt-1">
              <p className="font-mono text-[11px] leading-6 text-brand-text/26">
                Paste or drop another image anywhere in this canvas.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={cn("flex justify-end", embedded ? "mt-3 pt-0" : "mt-4 border-t border-brand-text/8 pt-4")}>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-[9px] border border-brand-text/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-brand-text/52 transition-colors hover:border-brand-text/22 hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload image
        </button>
      </div>

      <Modal
        open={Boolean(activeAttachment && activePreviewUrl)}
        onClose={() => setActivePreviewId(null)}
        size="xl"
        className="max-w-6xl bg-brand-dark text-brand-sidebar-text"
      >
        <div className="bg-brand-dark">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
                Image Preview
              </p>
              <p className="truncate text-sm text-white/80">
                {activeAttachment?.fileName ?? "Attachment"}
              </p>
            </div>
          </div>
          <div className="flex max-h-[80vh] items-center justify-center p-4 sm:p-6">
            {activePreviewUrl ? (
              <img
                src={activePreviewUrl}
                alt={activeAttachment?.fileName ?? "Attachment preview"}
                className="max-h-[72vh] w-auto max-w-full rounded-[18px] object-contain shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
              />
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
