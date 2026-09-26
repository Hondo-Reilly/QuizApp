import { app } from "electron";
import path from "node:path";
import { isSafeAttemptId } from "../../shared/attemptRecord";
import { isPhotoName } from "../../shared/questionTypes";
import { quizAssetFileInDir, quizAssetsDirInDir, quizFileInDir } from "./quizPath";

export function quizzesDir(): string {
  return path.join(app.getPath("userData"), "quizzes");
}

export function indexFile(): string {
  return path.join(quizzesDir(), "index.json");
}

export function quizFile(id: string): string {
  return quizFileInDir(quizzesDir(), id);
}

export function quizAssetsDir(id: string): string {
  return quizAssetsDirInDir(quizzesDir(), id);
}

export function quizAssetFile(id: string, rel: string): string {
  return quizAssetFileInDir(quizzesDir(), id, rel);
}

/** Photos from image-response answers: attempt-photos/<attemptId>/<file>.jpg. */
export function attemptPhotosRoot(): string {
  return path.join(app.getPath("userData"), "attempt-photos");
}

export function attemptPhotosDir(attemptId: string): string {
  if (!isSafeAttemptId(attemptId)) throw new Error("Attempt id is not safe to store.");
  return path.join(attemptPhotosRoot(), attemptId);
}

export function attemptPhotoFile(attemptId: string, name: string): string {
  if (!isPhotoName(name)) throw new Error("Photo name is not allowed.");
  return path.join(attemptPhotosDir(attemptId), name);
}

export function attemptsFile(): string {
  return path.join(app.getPath("userData"), "attempts.json");
}
