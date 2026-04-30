const WEBP_MIME = "image/webp";

function replaceExtension(fileName: string, extension: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${base}.${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    image.src = url;
  });
}

export async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  if (file.type === WEBP_MIME) {
    return file;
  }
  if (!file.type.startsWith("image/")) {
    return file;
  }
  // Animated formats lose their animation when redrawn through canvas, so leave them alone.
  if (file.type === "image/gif" || file.type === "image/apng") {
    return file;
  }

  try {
    const image = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), WEBP_MIME, quality);
    });
    if (!blob || blob.type !== WEBP_MIME) {
      return file;
    }
    if (blob.size >= file.size) {
      return file;
    }

    return new File([blob], replaceExtension(file.name, "webp"), {
      type: WEBP_MIME,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
