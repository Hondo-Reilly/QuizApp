import type { SelfMark } from "./types";

export const SELF_MARKS: readonly SelfMark[] = ["got", "missed", "unsure"];

export const SELF_MARK_LABEL: Record<SelfMark, string> = {
  got: "I got it",
  missed: "I missed it",
  unsure: "I'm not sure",
};

export function isSelfMark(value: unknown): value is SelfMark {
  return value === "got" || value === "missed" || value === "unsure";
}

/**
 * Sets or clears a self-mark. "I'm not sure" also flags the question to study;
 * the user can unflag it afterwards.
 */
export function withSelfMark(
  state: { selfMarks: Record<string, SelfMark>; flagged: Record<string, boolean> },
  questionId: string,
  mark: SelfMark | null,
): { selfMarks: Record<string, SelfMark>; flagged: Record<string, boolean> } {
  const selfMarks = { ...state.selfMarks };
  if (mark) selfMarks[questionId] = mark;
  else delete selfMarks[questionId];
  const flagged =
    mark === "unsure" && !state.flagged[questionId]
      ? { ...state.flagged, [questionId]: true }
      : state.flagged;
  return { selfMarks, flagged };
}
