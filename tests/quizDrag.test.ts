import { describe, expect, it } from "vitest";
import { parseQuizDrag } from "../src/lib/quizDrag";

describe("quiz drag payload", () => {
  it("reads a quiz id and its current folder", () => {
    expect(parseQuizDrag(JSON.stringify({ id: "history", folderId: "root" }))).toEqual({
      id: "history",
      folderId: "root",
    });
    expect(parseQuizDrag(JSON.stringify({ id: "history", folderId: null }))).toEqual({
      id: "history",
      folderId: null,
    });
  });

  it("rejects a payload that is not a quiz", () => {
    expect(parseQuizDrag("")).toBeNull();
    expect(parseQuizDrag(JSON.stringify({ folderId: "root" }))).toBeNull();
    expect(parseQuizDrag(JSON.stringify({ id: "history", folderId: 4 }))).toBeNull();
  });
});
