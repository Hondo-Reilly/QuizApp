import { app } from "electron";
import path from "node:path";
import { quizFileInDir } from "./quizPath";

export function quizzesDir(): string {
  return path.join(app.getPath("userData"), "quizzes");
}

export function indexFile(): string {
  return path.join(quizzesDir(), "index.json");
}

export function quizFile(id: string): string {
  return quizFileInDir(quizzesDir(), id);
}

export function attemptsFile(): string {
  return path.join(app.getPath("userData"), "attempts.json");
}
