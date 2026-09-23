import type { Quiz, QuizAttempt } from "@shared/types";

const quizzes = new Map<string, Quiz>();
const attempts = new Map<string, QuizAttempt>();
const attemptsByQuiz = new Map<string, QuizAttempt[]>();

export function rememberQuiz(quiz: Quiz): void {
  quizzes.set(quiz.id, quiz);
}

export function rememberedQuiz(id: string): Quiz | null {
  return quizzes.get(id) ?? null;
}

export function rememberAttemptList(quizId: string, list: QuizAttempt[]): void {
  attemptsByQuiz.set(quizId, list);
  for (const attempt of list) attempts.set(attempt.id, attempt);
}

export function rememberedAttemptList(quizId: string): QuizAttempt[] | null {
  return attemptsByQuiz.get(quizId) ?? null;
}

export function rememberAttempt(attempt: QuizAttempt): void {
  attempts.set(attempt.id, attempt);
  const list = attemptsByQuiz.get(attempt.quizId);
  if (!list) return;
  const index = list.findIndex((item) => item.id === attempt.id);
  if (index === -1) return;
  const next = list.slice();
  next[index] = attempt;
  attemptsByQuiz.set(attempt.quizId, next);
}

export function rememberedAttempt(
  attemptId: string,
  quizId: string,
): QuizAttempt | null {
  const attempt = attempts.get(attemptId);
  if (!attempt || attempt.quizId !== quizId) return null;
  return attempt;
}

export function forgetAttempts(ids: string[]): void {
  const drop = new Set(ids);
  for (const id of ids) attempts.delete(id);
  for (const [quizId, list] of attemptsByQuiz) {
    const next = list.filter((attempt) => !drop.has(attempt.id));
    if (next.length !== list.length) attemptsByQuiz.set(quizId, next);
  }
}
