import type { UserAnswer } from "./types";

export function hasAnswer(value: UserAnswer): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
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
