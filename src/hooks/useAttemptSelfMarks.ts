import { useCallback, useState } from "react";
import { quizApi } from "@/api/quizApi";
import { rememberAttempt } from "@/lib/quizPageCache";
import { gradeQuiz, scoreOf } from "@shared/grading";
import { withSelfMark } from "@shared/selfMarks";
import type { AttemptScore, Question, SelfMark, UserAnswer } from "@shared/types";

export interface SelfMarkState {
  selfMarks: Record<string, SelfMark>;
  flagged: string[];
  score: AttemptScore;
}

/**
 * Changes self-marks on a finished attempt: the page updates at once, then the
 * new marks, score, and any "I'm not sure" flag are saved. A failed save puts
 * everything back and reports an error.
 */
export function useAttemptSelfMarks({
  attemptId,
  questions,
  answers,
  selfMarks,
  flagged,
  apply,
}: {
  attemptId: string | null;
  questions: readonly Question[];
  answers: Record<string, UserAnswer>;
  selfMarks: Record<string, SelfMark>;
  flagged: readonly string[];
  apply: (next: SelfMarkState) => void;
}): { mark: (questionId: string, mark: SelfMark | null) => void; error: string | null } {
  const [error, setError] = useState<string | null>(null);

  const mark = useCallback(
    (questionId: string, value: SelfMark | null) => {
      const previous: SelfMarkState = {
        selfMarks,
        flagged: [...flagged],
        score: scoreOf(gradeQuiz(questions, answers, selfMarks)),
      };
      const flagMap = Object.fromEntries(flagged.map((id) => [id, true]));
      const next = withSelfMark({ selfMarks, flagged: flagMap }, questionId, value);
      const nextFlagged = questions.map((q) => q.id).filter((id) => next.flagged[id]);
      const score = scoreOf(gradeQuiz(questions, answers, next.selfMarks));
      apply({ selfMarks: next.selfMarks, flagged: nextFlagged, score });
      if (!attemptId) return;
      setError(null);
      void (async () => {
        try {
          let saved = await quizApi.setAttemptSelfMarks(attemptId, next.selfMarks, score);
          if (nextFlagged.length !== flagged.length) {
            saved = await quizApi.setAttemptFlags(attemptId, nextFlagged);
          }
          rememberAttempt(saved);
        } catch (err) {
          apply(previous);
          const detail = err instanceof Error ? ` ${err.message}` : "";
          setError(`Could not save your mark.${detail}`);
        }
      })();
    },
    [attemptId, questions, answers, selfMarks, flagged, apply],
  );

  return { mark, error };
}
