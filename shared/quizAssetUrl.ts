import { isImagePath } from "./quizContent";
import { isSafeStorageId } from "./storageId";

/** Desktop URLs for package images: quizasset://quiz/<quizId>/images/<file>. */
export const QUIZ_ASSET_SCHEME = "quizasset";
const PREFIX = `${QUIZ_ASSET_SCHEME}://quiz/`;

export function quizAssetUrl(quizId: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${PREFIX}${encodeURIComponent(quizId)}/${encoded}`;
}

export function parseQuizAssetUrl(url: string): { quizId: string; path: string } | null {
  if (!url.startsWith(PREFIX)) return null;
  const rest = url.slice(PREFIX.length).split("?")[0].split("#")[0];
  const slash = rest.indexOf("/");
  if (slash < 0) return null;
  let quizId: string;
  let path: string;
  try {
    quizId = decodeURIComponent(rest.slice(0, slash));
    path = rest.slice(slash + 1).split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
  if (!isSafeStorageId(quizId) || !isImagePath(path)) return null;
  return { quizId, path };
}
