import { nanoid } from "nanoid";
import { slugifyTitle } from "@shared/storageId";
import { MAX_IMAGE_BYTES, looksLikeImage } from "@shared/quizPackage";
import { base64ToBytes, rasterizeSvgInPage } from "@shared/svgRaster";
import type { QuizAssetUpload } from "@shared/types";
import { pickFiles } from "./browserLocal";

const ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml";

function extensionOf(file: File): string | null {
  const fromName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const name = fromName === "jpeg" ? "jpg" : fromName;
  if (name && ["png", "jpg", "gif", "webp", "svg"].includes(name)) return name;
  const fromType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return fromType[file.type] ?? null;
}

/**
 * Reads an image file for the quiz, the way a .quiz package's images are
 * stored: an SVG becomes a PNG, and each image gets a new path under images/.
 */
export async function prepareImage(file: File): Promise<QuizAssetUpload> {
  const extension = extensionOf(file);
  if (!extension) throw new Error("Choose a PNG, JPEG, GIF, WebP, or SVG image.");
  let data: Uint8Array = new Uint8Array(await file.arrayBuffer());
  let finalExtension = extension;
  if (extension === "svg") {
    data = base64ToBytes(await rasterizeSvgInPage(new TextDecoder().decode(data)));
    finalExtension = "png";
  }
  const base = slugifyTitle(file.name.replace(/\.[^.]+$/, "")).slice(0, 40);
  const path = `images/${base}-${nanoid(6).replace(/[^A-Za-z0-9_-]/g, "")}.${finalExtension}`;
  if (data.length > MAX_IMAGE_BYTES) {
    throw new Error(`That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }
  if (!looksLikeImage(path, data)) throw new Error("That file isn't a readable image.");
  return { path, data };
}

/** Asks for one image file and prepares it. Resolves null if the picker is cancelled. */
export async function pickImage(): Promise<QuizAssetUpload | null> {
  const files = await pickFiles(ACCEPT, false);
  const file = files?.[0];
  return file ? prepareImage(file) : null;
}
