/** The longest side of a stored photo, in pixels. */
export const PHOTO_MAX_SIDE = 2048;
/** The largest original photo the app will try to read. */
export const PHOTO_MAX_INPUT_BYTES = 25 * 1024 * 1024;

/**
 * Shrinks a photo and re-encodes it as JPEG. Drawing it on a canvas drops all
 * metadata, including GPS location, and applies the camera's rotation.
 */
export async function processPhoto(file: Blob): Promise<Uint8Array> {
  if (file.size > PHOTO_MAX_INPUT_BYTES) {
    throw new Error("That photo is larger than 25 MB.");
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const heic = /hei[cf]/i.test(file.type) || (file instanceof File && /\.hei[cf]$/i.test(file.name));
    throw new Error(
      heic
        ? "HEIC photos can't be read here. Export the photo as JPEG, or add it from your phone in mobile mode."
        : "That image could not be read.",
    );
  }
  try {
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas is available to process the photo.");
    // JPEG has no transparency; a white background keeps drawings readable.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("The photo could not be saved.");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

/** A photo file name for a question: safe characters plus a random suffix. */
export function newPhotoName(questionId: string): string {
  const stem = questionId.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60) || "photo";
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${stem}-${random}.jpg`;
}
