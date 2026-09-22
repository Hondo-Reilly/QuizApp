import type { Choice, Question, UserAnswer } from "@shared/types";

export function selectByIndex(
  question: Question,
  orderedChoices: Choice[] | null,
  currentValue: UserAnswer,
  index: number,
): UserAnswer | null {
  if (question.type === "true_false") {
    if (index === 0) return true;
    if (index === 1) return false;
    return null;
  }
  if (!orderedChoices || index >= orderedChoices.length) return null;
  const id = orderedChoices[index].id;
  if (question.type === "multiple_choice") return id;

  const current = Array.isArray(currentValue) ? currentValue : [];
  return current.includes(id)
    ? current.filter((v) => v !== id)
    : [...current, id];
}
