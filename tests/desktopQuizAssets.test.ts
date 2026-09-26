import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { quizAssetUrl } from "@shared/quizAssetUrl";
import { readQuizPackage, writeQuizPackage } from "@shared/quizPackage";
import type { Quiz } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-assets-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getAppPath: () => userData },
  BrowserWindow: { getAllWindows: () => [] },
}));

const store = await import("../electron/lib/fileStore");
const { handleQuizAssetRequest } = await import("../electron/lib/quizAssets");
const mobile = await import("../electron/lib/mobileServer");

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7, 7]);

function imageQuiz(): Quiz {
  const quiz = makeQuiz();
  quiz.schemaVersion = 2;
  quiz.id = "pictures";
  quiz.questions[0].image = { src: "images/sub/pic.png", alt: "Picture" };
  return quiz;
}

let packageFile = "";

beforeAll(async () => {
  packageFile = path.join(userData, "pictures.quiz");
  const bytes = writeQuizPackage(imageQuiz(), new Map([["images/sub/pic.png", PNG]]));
  await fs.writeFile(packageFile, bytes);
});

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

describe("desktop quiz images", () => {
  it("imports a .quiz package and stores its images beside the quiz", async () => {
    const meta = await store.importQuizFromFile(packageFile);
    expect(meta.id).toBe("pictures");
    const stored = path.join(userData, "quizzes", "pictures.assets", "images", "sub", "pic.png");
    expect(new Uint8Array(await fs.readFile(stored))).toEqual(PNG);
    expect((await store.getQuiz("pictures"))?.questions[0].image?.src).toBe("images/sub/pic.png");
  });

  it("serves stored images through quizasset:// and nothing else", async () => {
    const ok = await handleQuizAssetRequest(
      new Request(quizAssetUrl("pictures", "images/sub/pic.png")),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(PNG);

    const missing = await handleQuizAssetRequest(
      new Request(quizAssetUrl("pictures", "images/none.png")),
    );
    expect(missing.status).toBe(404);
    const escape = await handleQuizAssetRequest(
      new Request("quizasset://quiz/pictures/images/%2E%2E/%2E%2E/index.json"),
    );
    expect(escape.status).toBe(404);
  });

  it("exports the quiz and its images back to a package", async () => {
    const exported = await store.exportQuizPackage("pictures");
    const read = readQuizPackage(exported!.bytes);
    expect(read.assets.get("images/sub/pic.png")).toEqual(PNG);
  });

  it("serves the running quiz's images to the phone only with the session token", async () => {
    const quiz = (await store.getQuiz("pictures"))!;
    const url = new URL(
      await mobile.startMobileServer({
        quiz,
        revealMode: "at_end",
        order: quiz.questions.map((q) => q.id),
        choicesOrder: {},
        currentIndex: 0,
        answers: {},
        submitted: {},
        flagged: {},
        selfMarks: {},
        selfMarking: false,
        theme: "dark",
        deadlineAt: null,
      }),
    );
    try {
      const base = `http://127.0.0.1:${url.port}`;
      const token = url.searchParams.get("token")!;
      const image = `${base}/asset/images/sub/pic.png`;
      const ok = await fetch(`${image}?token=${encodeURIComponent(token)}`);
      expect(ok.status).toBe(200);
      expect(new Uint8Array(await ok.arrayBuffer())).toEqual(PNG);
      expect((await fetch(image)).status).toBe(401);
      expect((await fetch(`${image}?token=wrong`)).status).toBe(401);
      const unlisted = await fetch(
        `${base}/asset/images/other.png?token=${encodeURIComponent(token)}`,
      );
      expect(unlisted.status).toBe(404);
    } finally {
      await mobile.stopMobileServer();
    }
  });

  it("converts SVGs to PNG on import", async () => {
    const quiz = imageQuiz();
    quiz.id = "vector";
    quiz.questions[0].image = { src: "images/shape.svg", alt: "Shape" };
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"/>');
    const file = path.join(userData, "vector.quiz");
    await fs.writeFile(file, writeQuizPackage(quiz, new Map([["images/shape.svg", svg]])));
    const withFake: typeof import("../electron/lib/svgRaster").withSvgRasterizer = (work) =>
      work(async () => PNG);

    await store.importQuizFromFile(file, null, withFake);
    const stored = await store.getQuiz("vector");
    expect(stored?.questions[0].image?.src).toBe("images/shape.png");
    const dir = path.join(userData, "quizzes", "vector.assets", "images");
    expect(await fs.readdir(dir)).toEqual(["shape.png"]);
    await store.deleteQuiz("vector");
  });

  it("deletes the images with the quiz", async () => {
    await store.deleteQuiz("pictures");
    await expect(fs.stat(path.join(userData, "quizzes", "pictures.assets"))).rejects.toThrow();
  });

  it("leaves nothing behind when a package fails to import", async () => {
    const bad = path.join(userData, "bad.quiz");
    const quiz = imageQuiz();
    quiz.id = "broken";
    await fs.writeFile(bad, writeQuizPackage(quiz, new Map([["images/sub/pic.png", new Uint8Array([1, 2, 3])]])));
    await expect(store.importQuizFromFile(bad)).rejects.toThrow(/not a valid image/);
    await expect(fs.stat(path.join(userData, "quizzes", "broken.assets"))).rejects.toThrow();
  });
});
