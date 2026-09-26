import fs from "node:fs/promises";
import { imageContentType } from "../../shared/quizContent";
import { parseAttemptPhotoUrl, parseQuizAssetUrl } from "../../shared/quizAssetUrl";
import { readAttemptPhoto } from "./attemptStore";
import { quizAssetFile } from "./paths";

/** Reads a stored package image, or null when the path is invalid or missing. */
export async function readQuizAsset(quizId: string, rel: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(quizAssetFile(quizId, rel));
  } catch {
    return null;
  }
}

const HEADERS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" };

export async function handleQuizAssetRequest(request: Request): Promise<Response> {
  const photo = parseAttemptPhotoUrl(request.url);
  if (photo) {
    const data = await readAttemptPhoto(photo.attemptId, photo.name);
    if (!data) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: { ...HEADERS, "Content-Type": "image/jpeg" },
    });
  }
  const target = parseQuizAssetUrl(request.url);
  const data = target ? await readQuizAsset(target.quizId, target.path) : null;
  if (!target || !data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": imageContentType(target.path),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });
}
