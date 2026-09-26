import path from "node:path";
import { isImagePath } from "../../shared/quizContent";
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

/** Package images for a quiz live in "<id>.assets" beside "<id>.json". */
export function quizAssetsDirInDir(dir: string, id: string): string {
  return quizFileInDir(dir, id).replace(/\.json$/, ".assets");
}

/** Resolves an images/ path inside a quiz's asset folder, refusing escapes. */
export function quizAssetFileInDir(dir: string, id: string, rel: string): string {
  if (!isImagePath(rel)) throw new Error("Image path is not allowed.");
  const root = quizAssetsDirInDir(dir, id);
  const file = path.resolve(root, rel);
  if (!file.startsWith(`${root}${path.sep}`)) {
    throw new Error("Image path is outside the quiz.");
  }
  return file;
}
