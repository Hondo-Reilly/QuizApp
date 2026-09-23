import { useEffect } from "react";
import type { Question, UserAnswer } from "@shared/types";
import { orderChoices } from "@/components/quiz/orderChoices";
import { selectByIndex } from "@/components/quiz/selectChoice";

export interface UseQuizKeyboardArgs {
  question: Question | null;
  value: UserAnswer;
  choiceOrder?: readonly string[];
  onSetAnswer: (value: UserAnswer) => void;
  onPrimary: () => void;
  onPrevious: () => void;
  onNext: () => void;
  answerDisabled: boolean;
}

function digitIndex(key: string): number | null {
  if (key.length !== 1) return null;
  const n = key.charCodeAt(0) - "0".charCodeAt(0);
  return n >= 1 && n <= 9 ? n - 1 : null;
}

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest("[aria-modal='true']")) return true;
  const tag = el.tagName;
  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    tag === "A"
  ) {
    return true;
  }
  const role = el.getAttribute("role");
  return role === "button" || role === "link";
}

export function useQuizKeyboard({
  question,
  value,
  choiceOrder,
  onSetAnswer,
  onPrimary,
  onPrevious,
  onNext,
  answerDisabled,
}: UseQuizKeyboardArgs): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[aria-modal='true']")) return;
      if (isInteractiveTarget(e.target)) return;

      if (e.key === "Enter") {
        e.preventDefault();
        onPrimary();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrevious();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
        return;
      }

      if (!question || answerDisabled) return;
      const idx = digitIndex(e.key);
      if (idx === null) return;

      const ordered =
        question.type === "true_false"
          ? null
          : orderChoices(question.choices, choiceOrder);
      const next = selectByIndex(question, ordered, value, idx);
      if (next === null) return;
      e.preventDefault();
      onSetAnswer(next);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    question,
    value,
    choiceOrder,
    onSetAnswer,
    onPrimary,
    onPrevious,
    onNext,
    answerDisabled,
  ]);
}
