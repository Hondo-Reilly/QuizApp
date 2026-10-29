import { isMatchAnswer } from "./matching";
import { parseNumericAnswer } from "./numeric";
import { isPhotoAnswer, isTextQuestion, textLimits } from "./questionTypes";
import type { Question, UserAnswer } from "./types";

/**
 * Whether an answer has been given. Written answers count once they are not
 * blank; use isAnswered to also apply a question's minimum length.
 */
export function hasAnswer(value: UserAnswer | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (isPhotoAnswer(value)) return value.photos.length > 0;
  if (isMatchAnswer(value)) return Object.keys(value.matches).length > 0;
  return true;
}

/** Whether an answer is complete enough to submit for this question. */
export function isAnswered(question: Question | undefined, value: UserAnswer | undefined): boolean {
  if (!hasAnswer(value)) return false;
  if (question && isTextQuestion(question) && typeof value === "string") {
    return value.trim().length >= textLimits(question).minLength;
  }
  if (question?.type === "numeric") {
    return typeof value === "string" && parseNumericAnswer(value, question) !== null;
  }
  // Every item needs a match before a matching answer can be submitted.
  if (question?.type === "matching") {
    return isMatchAnswer(value) && question.items.every((item) => !!value.matches[item.id]);
  }
  return true;
}

export function countAnswered(
  order: readonly string[],
  answers: Record<string, UserAnswer>,
): number {
  let count = 0;
  for (const id of order) if (hasAnswer(answers[id] ?? null)) count += 1;
  return count;
}
