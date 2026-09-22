import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { nanoid } from "nanoid";
import type { QuizAttempt, SaveAttemptInput } from "../../shared/types";
import { attemptsFile } from "./paths";

interface AttemptsFile {
  version: number;
  attempts: QuizAttempt[];
}

function emptyFile(): AttemptsFile {
  return { version: 1, attempts: [] };
}

async function readAttempts(): Promise<AttemptsFile> {
  if (!existsSync(attemptsFile())) return emptyFile();
  try {
    const raw = await fs.readFile(attemptsFile(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<AttemptsFile>;
    return {
      version: 1,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
    };
  } catch {
    return emptyFile();
  }
}

async function writeAttempts(file: AttemptsFile): Promise<void> {
  await fs.writeFile(attemptsFile(), JSON.stringify(file, null, 2), "utf-8");
}

export async function saveAttempt(input: SaveAttemptInput): Promise<QuizAttempt> {
  const file = await readAttempts();
  const attempt: QuizAttempt = {
    id: nanoid(10),
    quizId: input.quizId,
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
