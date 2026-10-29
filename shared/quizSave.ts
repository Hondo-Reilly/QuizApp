import { toMetadata } from "./library";
import { imageRefs, isImagePath } from "./quizContent";
import { describeIssue, quizIssues } from "./quizIssues";
import { parseQuiz } from "./schema";
import type { Quiz, QuizMetadata } from "./types";

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
