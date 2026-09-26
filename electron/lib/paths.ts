import { app } from "electron";
import path from "node:path";
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

export function attemptsFile(): string {
  return path.join(app.getPath("userData"), "attempts.json");
}
