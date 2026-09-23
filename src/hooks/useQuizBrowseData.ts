import { useEffect, useState } from "react";
import { quizApi } from "@/api/quizApi";
import {
  forgetAttempts,
  rememberAttemptList,
  rememberQuiz,
  rememberedAttemptList,
  rememberedQuiz,
} from "@/lib/quizPageCache";
import type { Quiz, QuizAttempt } from "@shared/types";

export function useQuizBrowseData(quizId: string): {
  quiz: Quiz | null;
  attempts: QuizAttempt[];
  loading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  removeAttempts: (ids: string[]) => Promise<void>;
} {
  const [quiz, setQuiz] = useState<Quiz | null>(() => rememberedQuiz(quizId));
  const [attempts, setAttempts] = useState<QuizAttempt[]>(
    () => rememberedAttemptList(quizId) ?? [],
  );
  const [loading, setLoading] = useState(
    () => rememberedQuiz(quizId) == null || rememberedAttemptList(quizId) == null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const knownQuiz = rememberedQuiz(quizId);
    const knownAttempts = rememberedAttemptList(quizId);
    if (knownQuiz && knownAttempts) {
      setQuiz(knownQuiz);
      setAttempts(knownAttempts);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
    Promise.all([quizApi.getQuiz(quizId), quizApi.listAttempts(quizId)])
      .then(([loadedQuiz, loadedAttempts]) => {
        if (!active) return;
        if (!loadedQuiz) setError("Quiz not found.");
        else {
          rememberQuiz(loadedQuiz);
          rememberAttemptList(quizId, loadedAttempts);
          setQuiz(loadedQuiz);
          setAttempts(loadedAttempts);
        }
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
  }, [quizId]);

  const removeAttempts = async (ids: string[]) => {
    await quizApi.deleteAttempts(ids);
    forgetAttempts(ids);
    const drop = new Set(ids);
    setAttempts((current) => current.filter((attempt) => !drop.has(attempt.id)));
  };

  return { quiz, attempts, loading, error, setError, removeAttempts };
}
