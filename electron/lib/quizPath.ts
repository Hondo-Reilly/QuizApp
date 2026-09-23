import path from "node:path";
import { isSafeStorageId } from "../../shared/storageId";

export function quizFileInDir(dir: string, id: string): string {
  if (!isSafeStorageId(id)) {
    throw new Error("Quiz id is not safe to store as a filename.");
  }
  const root = path.resolve(dir);
  const file = path.resolve(root, `${id}.json`);
  if (path.dirname(file) !== root) {
    throw new Error("Quiz path is outside the library.");
  }
  return file;
}
