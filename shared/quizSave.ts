import { toMetadata } from "./library";
import { MAX_IMAGE_BYTES, looksLikeImage } from "./quizPackage";
import { imageRefs, isImagePath } from "./quizContent";
import { describeIssue, quizIssues } from "./quizIssues";
import { parseQuiz } from "./schema";
import type { Quiz, QuizAssetUpload, QuizMetadata } from "./types";

/**
 * Checks a quiz from the editor against the import rules and readies it for
 * storage: always schema version 2, under the given storage id. The renderer
 * is not trusted, so both stores run this before writing.
 */
export function prepareSavedQuiz(raw: unknown, id: string): Quiz {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("That isn't a quiz.");
  const candidate = { ...raw, schemaVersion: 2, id } as Quiz;
  const issues = Array.isArray(candidate.questions) ? quizIssues(candidate) : [];
  if (issues.length > 0) {
    throw new Error(`This quiz can't be saved yet. ${describeIssue(candidate, issues[0])}`);
  }
  const quiz = parseQuiz(candidate) as Quiz;
  // Stored quizzes only point at PNG, JPEG, GIF, and WebP; SVGs are converted on import.
  const unsupported = imageRefs(quiz).find((src) => !isImagePath(src));
  if (unsupported) throw new Error(`Image ${unsupported} must be a png, jpg, gif, or webp file.`);
  return quiz;
}

/**
 * The images from the editor that the quiz uses, checked like package images:
 * a PNG, JPEG, GIF, or WebP file under images/, no larger than a package allows.
 * Images the quiz doesn't use are dropped.
 */
export function checkedUploads(raw: unknown, quiz: Quiz): QuizAssetUpload[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("The images sent with this quiz are not valid.");
  const used = new Set(imageRefs(quiz));
  const out = new Map<string, Uint8Array>();
  for (const item of raw as unknown[]) {
    const path = (item as { path?: unknown })?.path;
    const data = (item as { data?: unknown })?.data;
    if (typeof path !== "string" || !(data instanceof Uint8Array)) {
      throw new Error("The images sent with this quiz are not valid.");
    }
    if (!used.has(path)) continue;
    if (!isImagePath(path)) throw new Error(`Image ${path} must be a png, jpg, gif, or webp file.`);
    if (data.length > MAX_IMAGE_BYTES) {
      throw new Error(`${path} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
    }
    if (!looksLikeImage(path, data)) throw new Error(`${path} is not a valid image.`);
    out.set(path, data);
  }
  return [...out].map(([path, data]) => ({ path, data }));
}

/** The first image the quiz points at that its stored images don't include. */
export function missingImage(quiz: Quiz, hasImage: (src: string) => boolean): string | null {
  return imageRefs(quiz).find((src) => !hasImage(src)) ?? null;
}

export function missingImageMessage(src: string): string {
  return `Image ${src} isn't stored with this quiz.`;
}

/** The library entry after a save: new title and counts, same place and import date. */
export function savedMetadata(previous: QuizMetadata, quiz: Quiz, updatedAt: string): QuizMetadata {
  return { ...toMetadata(quiz, previous.importedAt, previous.folderId), updatedAt };
}
