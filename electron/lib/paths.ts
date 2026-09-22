import { app } from "electron";
import path from "node:path";

export function quizzesDir(): string {
  return path.join(app.getPath("userData"), "quizzes");
}

export function indexFile(): string {
  return path.join(quizzesDir(), "index.json");
}

export function quizFile(id: string): string {
  return path.join(quizzesDir(), `${id}.json`);
}

export function attemptsFile(): string {
  return path.join(app.getPath("userData"), "attempts.json");
}
