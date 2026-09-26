import fs from "node:fs/promises";
import { imageContentType } from "../../shared/quizContent";
import { parseQuizAssetUrl } from "../../shared/quizAssetUrl";
import { quizAssetFile } from "./paths";

/** Reads a stored package image, or null when the path is invalid or missing. */
export async function readQuizAsset(quizId: string, rel: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(quizAssetFile(quizId, rel));
  } catch {
    return null;
  }
}

export async function handleQuizAssetRequest(request: Request): Promise<Response> {
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
