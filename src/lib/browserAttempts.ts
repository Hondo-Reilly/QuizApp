import { nanoid } from "nanoid";
import { withAttemptFlags } from "@shared/attemptFlags";
import {
  attemptPhotoNames,
  buildAttempt,
  withAttemptSelfMarks,
} from "@shared/attemptRecord";
import type { AttemptScore, QuizAttempt, SaveAttemptInput } from "@shared/types";
import {
  ATTEMPTS_KEY,
  attemptPhotoKey,
  changeRecords,
  readRecord,
  type RecordChange,
} from "./idbRecords";

export async function readAttempts(): Promise<QuizAttempt[]> {
  return (await readRecord<QuizAttempt[]>(ATTEMPTS_KEY)) ?? [];
}

function photoDeletes(attempts: readonly QuizAttempt[]): RecordChange[] {
  return attempts.flatMap((attempt) =>
    attemptPhotoNames(attempt).map((name) => ({
      key: attemptPhotoKey(attempt.id, name),
      delete: true as const,
    })),
  );
}

export async function saveBrowserAttempt(
  input: SaveAttemptInput,
): Promise<QuizAttempt> {
  const attempts = await readAttempts();
  const { attempt, photos } = buildAttempt(nanoid(10), new Date().toISOString(), input);
  // The attempt and its photos are saved in one transaction.
  await changeRecords([
    ...photos.map((photo) => ({
      key: attemptPhotoKey(attempt.id, photo.name),
      value: photo.data,
    })),
    { key: ATTEMPTS_KEY, value: [attempt, ...attempts] },
  ]);
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

export async function readBrowserAttemptPhoto(
  attemptId: string,
  name: string,
): Promise<Uint8Array | undefined> {
  return readRecord<Uint8Array>(attemptPhotoKey(attemptId, name));
}

export async function setBrowserAttemptFlags(
  id: string,
  flagged: string[],
): Promise<QuizAttempt> {
  const next = withAttemptFlags(await readAttempts(), id, flagged);
  await changeRecords([{ key: ATTEMPTS_KEY, value: next.attempts }]);
  return next.attempt;
}

export async function setBrowserAttemptSelfMarks(
  id: string,
  selfMarks: Record<string, unknown>,
  score: AttemptScore,
): Promise<QuizAttempt> {
  const next = withAttemptSelfMarks(await readAttempts(), id, selfMarks, score);
  await changeRecords([{ key: ATTEMPTS_KEY, value: next.attempts }]);
  return next.attempt;
}

export async function deleteBrowserAttempts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const drop = new Set(ids);
  const attempts = await readAttempts();
  const next = attempts.filter((attempt) => !drop.has(attempt.id));
  if (next.length !== attempts.length) {
    await changeRecords([
      ...photoDeletes(attempts.filter((attempt) => drop.has(attempt.id))),
      { key: ATTEMPTS_KEY, value: next },
    ]);
  }
}

/** Changes that remove the attempts of deleted quizzes, and those attempts' photos. */
export async function attemptChangesWithoutQuizzes(
  quizIds: readonly string[],
): Promise<RecordChange[]> {
  if (quizIds.length === 0) return [];
  const drop = new Set(quizIds);
  const attempts = await readAttempts();
  const removed = attempts.filter((attempt) => drop.has(attempt.quizId));
  if (removed.length === 0) return [];
  return [
    ...photoDeletes(removed),
    { key: ATTEMPTS_KEY, value: attempts.filter((attempt) => !drop.has(attempt.quizId)) },
  ];
}
