import { describe, expect, it } from "vitest";
import { clearAppLocalStorage } from "@/lib/appStorage";

function memoryStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    snapshot() {
      return [...values.keys()].sort();
    },
  };
}

describe("clearAppLocalStorage", () => {
  it("removes quizapp keys and leaves other keys", () => {
    const storage = memoryStorage({
      "quizapp:theme": "dark",
      "quizapp:accent": "pink",
      "quizapp:setup": "{}",
      "other-app": "keep",
    });
    clearAppLocalStorage(storage);
    expect(storage.snapshot()).toEqual(["other-app"]);
  });
});
