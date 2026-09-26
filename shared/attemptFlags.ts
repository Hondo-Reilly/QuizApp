import type { QuizAttempt } from "./types";

/**
 * Keeps only flags for questions in the attempt, once each, in question order.
 * Flags arrive from the renderer and the phone, so they are never trusted as-is.
 */
export function cleanFlags(flagged: readonly unknown[], questionIds: readonly string[]): string[] {
  const wanted = new Set(flagged.filter((id): id is string => typeof id === "string"));
  return questionIds.filter((id) => wanted.has(id));
}

export function flaggedIds(attempt: Pick<QuizAttempt, "flagged">): string[] {
  return attempt.flagged ?? [];
}

/** Returns the attempt with new flags, or throws if the attempt is not in the list. */
export function withAttemptFlags(
  attempts: readonly QuizAttempt[],
  attemptId: string,
  flagged: readonly unknown[],
): { attempts: QuizAttempt[]; attempt: QuizAttempt } {
  const index = attempts.findIndex((item) => item.id === attemptId);
  if (index === -1) throw new Error("Attempt not found");
  const attempt = {
    ...attempts[index],
    flagged: cleanFlags(Array.isArray(flagged) ? flagged : [], attempts[index].questionIds),
  };
  const next = attempts.slice();
  next[index] = attempt;
  return { attempts: next, attempt };
}
