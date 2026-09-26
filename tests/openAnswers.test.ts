import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { hasAnswer, isAnswered } from "@shared/answers";
import { buildAttempt, withAttemptSelfMarks } from "@shared/attemptRecord";
import { gradeQuiz, questionOutcome } from "@shared/grading";
import {
  applyMobilePatch,
  createMobileSession,
  isMobilePatch,
  mobilePatchIssue,
  type MobileSessionSeed,
} from "@shared/mobile";
import { parseQuiz } from "@shared/schema";
import { attemptPhotoUrl, parseAttemptPhotoUrl } from "@shared/quizAssetUrl";
import { buildAttemptExport } from "@/lib/exportAttempt";
import type { Quiz, QuizAttempt, SaveAttemptInput } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-open-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getAppPath: () => userData },
  BrowserWindow: { getAllWindows: () => [] },
}));

const attemptStore = await import("../electron/lib/attemptStore");
const { handleQuizAssetRequest } = await import("../electron/lib/quizAssets");
const mobile = await import("../electron/lib/mobileServer");

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function openQuiz(): Quiz {
  const quiz = makeQuiz();
  quiz.schemaVersion = 2;
  quiz.questions.push(
    { id: "short", type: "short_answer", prompt: "Name it.", maxLength: 20, sampleAnswer: "CO2" },
    { id: "long", type: "long_answer", prompt: "Explain.", minLength: 10, rubric: ["Tilt"] },
    { id: "code", type: "long_answer", prompt: "Code it.", code: true, language: "python" },
    { id: "photo", type: "image_response", prompt: "Draw it.", maxImages: 2 },
  );
  return quiz;
}

function seed(overrides: Partial<MobileSessionSeed> = {}): MobileSessionSeed {
  const quiz = openQuiz();
  return {
    quiz,
    revealMode: "after_each",
    order: quiz.questions.map((q) => q.id),
    choicesOrder: {},
    currentIndex: 0,
    answers: {},
    submitted: {},
    flagged: {},
    selfMarks: {},
    selfMarking: true,
    theme: "light",
    deadlineAt: null,
    ...overrides,
  };
}

describe("open question schema", () => {
  it("accepts written, code, and photo questions in version 2", () => {
    const quiz = openQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("rejects them in version 1 and checks their limits", () => {
    const v1 = { ...openQuiz(), schemaVersion: 1 };
    expect(() => parseQuiz(v1)).toThrow(/need schemaVersion 2/);
    const bad = (change: Record<string, unknown>, index = 3) => {
      const quiz = openQuiz() as unknown as { questions: Record<string, unknown>[] };
      Object.assign(quiz.questions[index], change);
      return () => parseQuiz(quiz);
    };
    expect(bad({ minLength: 30, maxLength: 20 })).toThrow(/minLength/);
    expect(bad({ maxLength: 60_000 })).toThrow();
    expect(bad({ language: "python" }, 4)).toThrow(/code answer/);
    expect(bad({ maxImages: 11 }, 6)).toThrow();
    expect(bad({ maxImages: 0 }, 6)).toThrow();
  });
});

describe("answering and grading open questions", () => {
  const quiz = openQuiz();
  const long = quiz.questions.find((q) => q.id === "long")!;

  it("counts blank text as unanswered and applies minLength", () => {
    expect(hasAnswer("   ")).toBe(false);
    expect(hasAnswer({ photos: [] })).toBe(false);
    expect(hasAnswer({ photos: ["p-1.jpg"] })).toBe(true);
    expect(isAnswered(long, "too short")).toBe(false);
    expect(isAnswered(long, "long enough now")).toBe(true);
  });

  it("leaves open answers ungraded unless self-marked got or missed", () => {
    expect(questionOutcome(long, "text")).toBe("ungraded");
    expect(questionOutcome(long, "text", "unsure")).toBe("ungraded");
    expect(questionOutcome(long, "text", "got")).toBe("correct");
    expect(questionOutcome(long, "text", "missed")).toBe("wrong");
    const grade = gradeQuiz(quiz.questions, { tf: false, single: "b", short: "CO2" }, { short: "got", long: "missed" });
    expect(grade).toMatchObject({ correct: 3, total: 5, ungraded: 2, percent: 60 });
  });
});

describe("attempt records", () => {
  const input = (overrides: Partial<SaveAttemptInput> = {}): SaveAttemptInput => ({
    quizId: "quiz-1",
    startedAt: "2026-09-26T10:00:00.000Z",
    correct: 1,
    total: 2,
    percent: 50,
    ungraded: 2,
    questionIds: ["tf", "short", "photo"],
    answers: { short: "CO2", photo: { photos: ["photo-a.jpg"] } },
    selfMarking: true,
    selfMarks: { short: "got", photo: "nope" as never, ghost: "got" },
    photos: [
      { name: "photo-a.jpg", data: JPEG },
      { name: "unused.jpg", data: JPEG },
    ],
    ...overrides,
  });

  it("keeps only valid marks and the photos the answers use", () => {
    const { attempt, photos } = buildAttempt("a1", "2026-09-26T10:05:00.000Z", input());
    expect(attempt.selfMarks).toEqual({ short: "got" });
    expect(attempt.ungraded).toBe(2);
    expect(photos.map((p) => p.name)).toEqual(["photo-a.jpg"]);
    expect("photos" in attempt).toBe(false);
  });

  it("refuses to save an answer whose photo is missing", () => {
    expect(() => buildAttempt("a1", "now", input({ photos: [] }))).toThrow(/Missing photo/);
  });

  it("only changes marks on attempts that allow self-marking", () => {
    const { attempt } = buildAttempt("a1", "now", input());
    const score = { correct: 2, total: 3, percent: 67, ungraded: 1 };
    const next = withAttemptSelfMarks([attempt], "a1", { photo: "missed" }, score);
    expect(next.attempt).toMatchObject({ selfMarks: { photo: "missed" }, ...score });
    const off = buildAttempt("a2", "now", input({ selfMarking: false })).attempt;
    expect(() => withAttemptSelfMarks([off], "a2", {}, score)).toThrow(/Self-marking is off/);
  });

  it("builds and parses desktop photo URLs safely", () => {
    const url = attemptPhotoUrl("abc_123", "photo-a.jpg");
    expect(parseAttemptPhotoUrl(url)).toEqual({ attemptId: "abc_123", name: "photo-a.jpg" });
    expect(parseAttemptPhotoUrl("quizasset://attempt/abc/..%2Fx.jpg")).toBeNull();
    expect(parseAttemptPhotoUrl("quizasset://attempt/abc/photo.png")).toBeNull();
  });
});

describe("desktop attempt photos", () => {
  it("are saved beside the attempt, served, and deleted with it", async () => {
    const saved = await attemptStore.saveAttempt({
      quizId: "quiz-1",
      startedAt: "2026-09-26T10:00:00.000Z",
      correct: 0,
      total: 0,
      percent: 0,
      ungraded: 1,
      questionIds: ["photo"],
      answers: { photo: { photos: ["photo-a.jpg"] } },
      photos: [{ name: "photo-a.jpg", data: JPEG }],
    });
    const file = path.join(userData, "attempt-photos", saved.id, "photo-a.jpg");
    expect(new Uint8Array(await fs.readFile(file))).toEqual(JPEG);

    const response = await handleQuizAssetRequest(new Request(attemptPhotoUrl(saved.id, "photo-a.jpg")));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");

    await attemptStore.deleteAttempts([saved.id]);
    await expect(fs.stat(path.join(userData, "attempt-photos", saved.id))).rejects.toThrow();
  });
});

describe("phone updates for open questions", () => {
  it("accept long text and photo names, within the question's limits", () => {
    const session = createMobileSession(seed());
    const text = { type: "answer", questionId: "short", answer: "x".repeat(20) } as const;
    expect(isMobilePatch(text)).toBe(true);
    expect(mobilePatchIssue(session, text)).toBeNull();
    expect(mobilePatchIssue(session, { ...text, answer: "x".repeat(21) })).toMatch(/does not match/);
    const photo = {
      type: "answer" as const,
      questionId: "photo",
      answer: { photos: ["photo-a.jpg", "photo-b.jpg"] },
    };
    expect(isMobilePatch(photo)).toBe(true);
    expect(mobilePatchIssue(session, photo)).toBeNull();
    expect(mobilePatchIssue(session, { ...photo, answer: { photos: ["a.jpg", "b.jpg", "c.jpg"] } })).toMatch(/does not match/);
    expect(isMobilePatch({ ...photo, answer: { photos: ["../x.jpg"] } })).toBe(false);
    expect(isMobilePatch({ ...photo, answer: { photos: [], extra: 1 } })).toBe(false);
  });

  it("need an answer long enough before submitting", () => {
    const session = createMobileSession(seed({ answers: { long: "short" } }));
    expect(mobilePatchIssue(session, { type: "submit", questionId: "long" })).toMatch(/Choose an answer/);
  });

  it("self-mark open answers only when self-marking is on, and flag unsure ones", () => {
    const session = createMobileSession(seed());
    const mark = { type: "mark", questionId: "long", mark: "unsure" } as const;
    expect(isMobilePatch(mark)).toBe(true);
    expect(mobilePatchIssue(session, mark)).toBeNull();
    const marked = applyMobilePatch(session, mark);
    expect(marked.selfMarks).toEqual({ long: "unsure" });
    expect(marked.flagged).toEqual({ long: true });
    expect(mobilePatchIssue(session, { ...mark, questionId: "tf" })).toMatch(/Only written and photo/);
    const off = createMobileSession(seed({ selfMarking: false }));
    expect(mobilePatchIssue(off, mark)).toMatch(/Self-marking is off/);
  });

  it("upload photos to the Mac with the session token, only for photo questions", async () => {
    const url = new URL(await mobile.startMobileServer(seed()));
    try {
      const base = `http://127.0.0.1:${url.port}`;
      const token = encodeURIComponent(url.searchParams.get("token")!);
      const upload = (questionId: string, body: Uint8Array, t = token) =>
        fetch(`${base}/photo?questionId=${questionId}&token=${t}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: body as BodyInit,
        });
      const ok = await upload("photo", JPEG);
      expect(ok.status).toBe(200);
      const { name } = (await ok.json()) as { name: string };
      expect(name).toMatch(/^photo-[0-9a-f]+\.jpg$/);
      expect(mobile.getMobilePhoto(name)).toEqual(JPEG);
      const served = await fetch(`${base}/photo/${name}?token=${token}`);
      expect(new Uint8Array(await served.arrayBuffer())).toEqual(JPEG);
      expect((await upload("short", JPEG)).status).toBe(400);
      expect((await upload("photo", new Uint8Array([1, 2, 3]))).status).toBe(400);
      expect((await upload("photo", JPEG, "wrong")).status).toBe(401);
    } finally {
      await mobile.stopMobileServer();
    }
  });
});

describe("exporting open answers", () => {
  it("gives photo paths inside the package and null grades for unmarked answers", () => {
    const quiz = openQuiz();
    const attempt: QuizAttempt = {
      id: "att1",
      quizId: quiz.id,
      completedAt: "2026-09-26T10:05:00.000Z",
      correct: 1,
      total: 3,
      percent: 33,
      ungraded: 4,
      questionIds: ["tf", "single", "short", "photo"],
      answers: { tf: false, single: "a", short: "CO2", photo: { photos: ["photo-a.jpg"] } },
      selfMarking: true,
      selfMarks: { short: "missed" },
    };
    const exported = buildAttemptExport(quiz, attempt, quiz.questions.filter((q) => attempt.questionIds.includes(q.id)));
    expect(exported.schemaVersion).toBe(2);
    expect(exported.ungraded).toBe(4);
    const byId = Object.fromEntries(exported.questions.map((q) => [q.id, q]));
    expect(byId.photo.selected).toEqual({ photos: ["responses/att1/photo-a.jpg"] });
    expect(byId.photo.correct).toBeNull();
    expect(byId.photo.outcome).toBe("ungraded");
    expect(byId.short).toMatchObject({ correct: false, outcome: "wrong", selfMark: "missed" });
  });
});
