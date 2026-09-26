import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { withAttemptFlags } from "../../shared/attemptFlags";
import { buildAttempt, withAttemptSelfMarks } from "../../shared/attemptRecord";
import type { AttemptScore, QuizAttempt, SaveAttemptInput } from "../../shared/types";
import { DamagedStoreError, readJsonIfPresent, writeJsonAtomic } from "./durableJson";
import { createMutationQueue } from "./mutationQueue";
import { attemptPhotoFile, attemptPhotosDir, attemptsFile } from "./paths";

const attemptWrites = createMutationQueue();

export function enqueueAttemptWrite<T>(task: () => Promise<T>): Promise<T> {
  return attemptWrites.enqueue(task);
}

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

export function saveAttempt(input: SaveAttemptInput): Promise<QuizAttempt> {
  return attemptWrites.enqueue(() => writeSavedAttempt(input));
}

async function writeSavedAttempt(input: SaveAttemptInput): Promise<QuizAttempt> {
  const file = await readAttempts();
  const { attempt, photos } = buildAttempt(nanoid(10), new Date().toISOString(), input);
  // Photos are written first, so a saved record never points at missing files.
  try {
    if (photos.length > 0) {
      await fs.mkdir(attemptPhotosDir(attempt.id), { recursive: true });
      for (const photo of photos) {
        await fs.writeFile(attemptPhotoFile(attempt.id, photo.name), photo.data);
      }
    }
    await writeAttempts({
      ...file,
      attempts: [attempt, ...file.attempts],
    });
  } catch (err) {
    await removeAttemptPhotos([attempt.id]);
    throw err;
  }
  return attempt;
}

async function removeAttemptPhotos(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    try {
      await fs.rm(attemptPhotosDir(id), { recursive: true, force: true });
    } catch {
      // An unsafe id never had a photo folder.
    }
  }
}

export async function readAttemptPhoto(attemptId: string, name: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(attemptPhotoFile(attemptId, name));
  } catch {
    return null;
  }
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

export function setAttemptFlags(id: string, flagged: string[]): Promise<QuizAttempt> {
  return attemptWrites.enqueue(async () => {
    const file = await readAttempts();
    const next = withAttemptFlags(file.attempts, id, flagged);
    await writeAttempts({ ...file, attempts: next.attempts });
    return next.attempt;
  });
}

export function setAttemptSelfMarks(
  id: string,
  selfMarks: Record<string, unknown>,
  score: AttemptScore,
): Promise<QuizAttempt> {
  return attemptWrites.enqueue(async () => {
    const file = await readAttempts();
    const next = withAttemptSelfMarks(file.attempts, id, selfMarks, score);
    await writeAttempts({ ...file, attempts: next.attempts });
    return next.attempt;
  });
}

export function deleteAttempts(ids: string[]): Promise<void> {
  return attemptWrites.enqueue(() => removeAttempts(ids));
}

async function removeAttempts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const file = await readAttempts();
  const next = file.attempts.filter((attempt) => !drop.has(attempt.id));
  if (next.length === file.attempts.length) return;
  await writeAttempts({ ...file, attempts: next });
  await removeAttemptPhotos(ids);
}

export function deleteAttemptsForQuizzes(quizIds: string[]): Promise<void> {
  return attemptWrites.enqueue(() => removeAttemptsForQuizzes(quizIds));
}

async function removeAttemptsForQuizzes(quizIds: string[]): Promise<void> {
  if (quizIds.length === 0) return;
  const drop = new Set(quizIds);
  const file = await readAttempts();
  const next = file.attempts.filter((attempt) => !drop.has(attempt.quizId));
  if (next.length === file.attempts.length) return;
  await writeAttempts({ ...file, attempts: next });
  await removeAttemptPhotos(
    file.attempts.filter((attempt) => drop.has(attempt.quizId)).map((attempt) => attempt.id),
  );
}
