import { describe, expect, it } from "vitest";
import { collectDescendantFolderIds, toMetadata } from "@shared/library";
import type { Folder, Quiz } from "@shared/types";

function folder(id: string, parentId: string | null): Folder {
  return { id, name: id, parentId, createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("shared library rules", () => {
  it("collects a folder and every folder inside it", () => {
    const folders = [
      folder("root", null),
      folder("child", "root"),
      folder("grandchild", "child"),
      folder("other", null),
    ];
    expect([...collectDescendantFolderIds(folders, "root")].sort()).toEqual([
      "child",
      "grandchild",
      "root",
    ]);
  });

  it("builds quiz metadata from the quiz and its folder", () => {
    const quiz: Quiz = {
      schemaVersion: 1,
      id: "history",
      title: "History",
      description: "Dates",
      questions: [
        {
          id: "q1",
          type: "true_false",
          prompt: "True?",
          answer: true,
        },
      ],
    };
    expect(toMetadata(quiz, "2026-09-23T00:00:00.000Z", "root")).toEqual({
      id: "history",
      title: "History",
      description: "Dates",
      author: undefined,
      tags: undefined,
      questionCount: 1,
      importedAt: "2026-09-23T00:00:00.000Z",
      folderId: "root",
    });
  });
});