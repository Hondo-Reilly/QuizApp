import { useEffect, useState } from "react";
import { quizApi } from "@/api/quizApi";
import {
  rememberAttempt,
  rememberQuiz,
  rememberedAttempt,
  rememberedQuiz,
} from "@/lib/quizPageCache";
import type { Quiz, QuizAttempt } from "@shared/types";

export function useSavedAttempt(
  quizId: string,
  attemptId: string,
): {
  quiz: Quiz | null;
  attempt: QuizAttempt | null;
  loading: boolean;
  error: string | null;
} {
  const [quiz, setQuiz] = useState<Quiz | null>(() => rememberedQuiz(quizId));
  const [attempt, setAttempt] = useState<QuizAttempt | null>(() =>
    rememberedAttempt(attemptId, quizId),
  );
  const [loading, setLoading] = useState(
    () =>
      rememberedQuiz(quizId) == null || rememberedAttempt(attemptId, quizId) == null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const knownQuiz = rememberedQuiz(quizId);
    const knownAttempt = rememberedAttempt(attemptId, quizId);
    if (knownQuiz && knownAttempt) {
      setQuiz(knownQuiz);
      setAttempt(knownAttempt);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
      setError(null);
    }
    Promise.all([quizApi.getQuiz(quizId), quizApi.getAttempt(attemptId)])
      .then(([loadedQuiz, loadedAttempt]) => {
        if (!active) return;
        if (!loadedQuiz) {
          setError("Quiz not found.");
          return;
        }
        if (!loadedAttempt || loadedAttempt.quizId !== quizId) {
          setError("Attempt not found.");
          return;
        }
        rememberQuiz(loadedQuiz);
        rememberAttempt(loadedAttempt);
        setQuiz(loadedQuiz);
        setAttempt(loadedAttempt);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quizId, attemptId]);

  return { quiz, attempt, loading, error };
}
