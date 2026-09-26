import { isSafeAttemptId } from "./attemptRecord";
import { isPhotoName } from "./questionTypes";
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

/** Desktop URLs for attempt photos: quizasset://attempt/<attemptId>/<file>. */
const ATTEMPT_PREFIX = `${QUIZ_ASSET_SCHEME}://attempt/`;

export function attemptPhotoUrl(attemptId: string, name: string): string {
  return `${ATTEMPT_PREFIX}${encodeURIComponent(attemptId)}/${encodeURIComponent(name)}`;
}

export function parseAttemptPhotoUrl(url: string): { attemptId: string; name: string } | null {
  if (!url.startsWith(ATTEMPT_PREFIX)) return null;
  const parts = url.slice(ATTEMPT_PREFIX.length).split("?")[0].split("#")[0].split("/");
  if (parts.length !== 2) return null;
  let attemptId: string;
  let name: string;
  try {
    attemptId = decodeURIComponent(parts[0]);
    name = decodeURIComponent(parts[1]);
  } catch {
    return null;
  }
  if (!isSafeAttemptId(attemptId) || !isPhotoName(name)) return null;
  return { attemptId, name };
}
