import { nanoid } from "nanoid";
import type { QuizAttempt, SaveAttemptInput } from "../../shared/types";
import { DamagedStoreError, readJsonIfPresent, writeJsonAtomic } from "./durableJson";
import { attemptsFile } from "./paths";

interface AttemptsFile {
  version: number;
  attempts: QuizAttempt[];
}

function emptyFile(): AttemptsFile {
  return { version: 1, attempts: [] };
}

async function readAttempts(): Promise<AttemptsFile> {
  const parsed = await readJsonIfPresent(attemptsFile());
  if (parsed === undefined) return emptyFile();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DamagedStoreError(attemptsFile());
  }
  const attempts = (parsed as Partial<AttemptsFile>).attempts;
  if (!Array.isArray(attempts)) throw new DamagedStoreError(attemptsFile());
  return { version: 1, attempts };
}

async function writeAttempts(file: AttemptsFile): Promise<void> {
  await writeJsonAtomic(attemptsFile(), file);
}

export async function saveAttempt(input: SaveAttemptInput): Promise<QuizAttempt> {
  const file = await readAttempts();
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
  await writeAttempts({
    ...file,
    attempts: [attempt, ...file.attempts],
  });
  return attempt;
}

export async function listAttempts(quizId: string): Promise<QuizAttempt[]> {
  const file = await readAttempts();
  return file.attempts
    .filter((attempt) => attempt.quizId === quizId)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
}

export async function getAttempt(id: string): Promise<QuizAttempt | null> {
  const file = await readAttempts();
  return file.attempts.find((attempt) => attempt.id === id) ?? null;
}

export async function deleteAttempts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const file = await readAttempts();
  const next = file.attempts.filter((attempt) => !drop.has(attempt.id));
  if (next.length === file.attempts.length) return;
  await writeAttempts({ ...file, attempts: next });
}

export async function deleteAttemptsForQuizzes(quizIds: string[]): Promise<void> {
  if (quizIds.length === 0) return;
  const drop = new Set(quizIds);
  const file = await readAttempts();
  const next = file.attempts.filter((attempt) => !drop.has(attempt.quizId));
  if (next.length === file.attempts.length) return;
  await writeAttempts({ ...file, attempts: next });
}
