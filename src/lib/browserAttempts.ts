import { nanoid } from "nanoid";
import type { QuizAttempt, SaveAttemptInput } from "@shared/types";
import { ATTEMPTS_KEY, changeRecords, readRecord } from "./idbRecords";

export async function readAttempts(): Promise<QuizAttempt[]> {
  return (await readRecord<QuizAttempt[]>(ATTEMPTS_KEY)) ?? [];
}

export async function saveBrowserAttempt(
  input: SaveAttemptInput,
): Promise<QuizAttempt> {
  const attempts = await readAttempts();
  const attempt: QuizAttempt = {
    id: nanoid(10),
    quizId: input.quizId,
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    correct: input.correct,
    total: input.total,
    percent: input.percent,
    questionIds: input.questionIds,
    answers: input.answers,
  };
  await changeRecords([{ key: ATTEMPTS_KEY, value: [attempt, ...attempts] }]);
  return attempt;
}

export async function listBrowserAttempts(quizId: string): Promise<QuizAttempt[]> {
  const attempts = await readAttempts();
  return attempts
    .filter((attempt) => attempt.quizId === quizId)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
}

export async function getBrowserAttempt(id: string): Promise<QuizAttempt | null> {
  const attempts = await readAttempts();
  return attempts.find((attempt) => attempt.id === id) ?? null;
}

export async function deleteBrowserAttempts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const attempts = await readAttempts();
  const next = attempts.filter((attempt) => !drop.has(attempt.id));
  if (next.length !== attempts.length) {
    await changeRecords([{ key: ATTEMPTS_KEY, value: next }]);
  }
}

export async function attemptsWithoutQuizzes(
  quizIds: readonly string[],
): Promise<QuizAttempt[] | null> {
  if (quizIds.length === 0) return null;
  const drop = new Set(quizIds);
  const attempts = await readAttempts();
  const next = attempts.filter((attempt) => !drop.has(attempt.quizId));
  return next.length === attempts.length ? null : next;
}
