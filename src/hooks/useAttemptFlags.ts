import { useCallback, useState } from "react";
import { quizApi } from "@/api/quizApi";
import { rememberAttempt } from "@/lib/quizPageCache";
import type { QuizAttempt } from "@shared/types";

/**
 * Saves flag changes on a finished attempt. The caller shows the new flags
 * right away; a failed save puts the old flags back and reports an error.
 */
export function useAttemptFlags(
  attemptId: string | null,
  flagged: readonly string[],
  apply: (next: string[]) => void,
): { toggle: (questionId: string) => void; error: string | null } {
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(
    (questionId: string) => {
      const previous = [...flagged];
      const next = previous.includes(questionId)
        ? previous.filter((id) => id !== questionId)
        : [...previous, questionId];
      apply(next);
      if (!attemptId) return;
      setError(null);
      quizApi
        .setAttemptFlags(attemptId, next)
        .then((saved: QuizAttempt) => rememberAttempt(saved))
        .catch((err: unknown) => {
          apply(previous);
          const detail = err instanceof Error ? ` ${err.message}` : "";
          setError(`Could not save the flag.${detail}`);
        });
    },
    [attemptId, flagged, apply],
  );

  return { toggle, error };
}
