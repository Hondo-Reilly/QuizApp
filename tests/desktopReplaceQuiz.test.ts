import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { writeQuizPackage } from "@shared/quizPackage";
import type { Quiz, QuizShare } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-replace-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getAppPath: () => userData },
  BrowserWindow: { getAllWindows: () => [] },
}));

const store = await import("../electron/lib/fileStore");

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 1]);
const PNG2 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 2, 2]);

function quizWithImage(src: string, title: string): Quiz {
  const quiz = makeQuiz();
  quiz.schemaVersion = 2;
  quiz.id = "shared";
  quiz.title = title;
  quiz.questions[0].image = { src, alt: "Picture" };
  return quiz;
}

const share: QuizShare = {
  code: "12345678",
  manageToken: "secret",
  version: 1,
  sha256: "abc",
  expiresAt: null,
  sharedAt: "2026-10-01T00:00:00.000Z",
  publishedAt: "2026-10-01T00:00:00.000Z",
};

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

describe("replacing a desktop quiz in place", () => {
  it("imports bytes with where they came from", async () => {
    const folder = await store.createFolder({ name: "Biology" });
    const bytes = writeQuizPackage(quizWithImage("images/old.png", "Old"), new Map([["images/old.png", PNG]]));
    const meta = await store.importQuizBytes(bytes, folder.id, {
      code: "87654321",
      version: 1,
      sha256: "first",
      checkedAt: "2026-10-01T00:00:00.000Z",
    });
    expect(meta).toMatchObject({ id: "shared", folderId: folder.id, cloudSource: { code: "87654321" } });
  });

  it("records share fields without touching the rest", async () => {
    await store.updateCloudFields(["shared", "missing"], () => ({ share }));
    const meta = await store.getQuizMetadata("shared");
    expect(meta?.share).toEqual(share);
    expect(meta?.title).toBe("Old");
  });

  it("swaps content and images but keeps id, folder, share and source", async () => {
    const before = (await store.getQuizMetadata("shared"))!;
    const bytes = writeQuizPackage(quizWithImage("images/new.png", "New"), new Map([["images/new.png", PNG2]]));
    const meta = await store.replaceQuizBytes("shared", bytes, {
      code: "87654321",
      version: 2,
      sha256: "second",
      checkedAt: "2026-10-02T00:00:00.000Z",
    });

    expect(meta).toMatchObject({
      id: "shared",
      title: "New",
      folderId: before.folderId,
      importedAt: before.importedAt,
      share,
      cloudSource: { version: 2, sha256: "second" },
    });
    expect(meta.updatedAt).toBeDefined();
    expect((await store.getQuiz("shared"))?.title).toBe("New");

    const quizzes = path.join(userData, "quizzes");
    expect(await fs.readdir(path.join(quizzes, "shared.assets", "images"))).toEqual(["new.png"]);
    expect(new Uint8Array(await fs.readFile(path.join(quizzes, "shared.assets", "images", "new.png")))).toEqual(PNG2);
    expect((await fs.readdir(quizzes)).filter((name) => name.includes(".assets."))).toEqual([]);
    expect((await store.listQuizzes()).map((q) => q.id)).toEqual(["shared"]);
  });

  it("marks an imported quiz replaced from a file as no longer matching its code", async () => {
    const bytes = writeQuizPackage(quizWithImage("images/new.png", "Mine"), new Map([["images/new.png", PNG2]]));
    const meta = await store.replaceQuizBytes("shared", bytes);
    expect(meta.cloudSource).toMatchObject({ code: "87654321", version: 2, replacedLocally: true });
    // Restore the title the next test expects.
    await store.replaceQuizBytes(
      "shared",
      writeQuizPackage(quizWithImage("images/new.png", "New"), new Map([["images/new.png", PNG2]])),
    );
  });

  it("leaves the old quiz whole when the new file is bad", async () => {
    await expect(store.replaceQuizBytes("shared", new TextEncoder().encode("{"))).rejects.toThrow();
    expect((await store.getQuiz("shared"))?.title).toBe("New");
    expect(await fs.readdir(path.join(userData, "quizzes", "shared.assets", "images"))).toEqual(["new.png"]);
  });

  it("refuses to replace a quiz that does not exist", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(makeQuiz()));
    await expect(store.replaceQuizBytes("nope", bytes)).rejects.toThrow(/Quiz not found/);
  });
});
