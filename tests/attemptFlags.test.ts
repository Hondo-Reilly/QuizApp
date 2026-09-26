import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { cleanFlags, withAttemptFlags } from "@shared/attemptFlags";
import {
  applyMobilePatch,
  createMobileSession,
  isMobilePatch,
  mobilePatchIssue,
} from "@shared/mobile";
import { buildAllAttemptsExport, buildAttemptExport } from "@/lib/exportAttempt";
import { useSessionStore } from "@/state/sessionStore";
import type { QuizAttempt } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-flags-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData },
}));

const attemptStore = await import("../electron/lib/attemptStore");

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

function attempt(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    id: "a1",
    quizId: "quiz-1",
    completedAt: "2026-09-26T10:00:00.000Z",
    correct: 2,
    total: 3,
    percent: 67,
    questionIds: ["tf", "single", "multi"],
    answers: { tf: false, single: "b", multi: ["a"] },
    ...overrides,
  };
}

describe("attempt flags", () => {
  it("keep only the attempt's questions, once each, in question order", () => {
    expect(cleanFlags(["multi", "nope", "tf", "multi", 7], ["tf", "single", "multi"])).toEqual([
      "tf",
      "multi",
    ]);
  });

  it("update one attempt and refuse an unknown attempt", () => {
    const list = [attempt(), attempt({ id: "a2" })];
    const next = withAttemptFlags(list, "a2", ["single"]);
    expect(next.attempt.flagged).toEqual(["single"]);
    expect(next.attempts[0]).toBe(list[0]);
    expect(() => withAttemptFlags(list, "missing", [])).toThrow(/not found/);
  });

  it("are saved and changed by the desktop attempt store", async () => {
    const saved = await attemptStore.saveAttempt({
      quizId: "quiz-1",
      startedAt: "2026-09-26T09:59:00.000Z",
      correct: 2,
      total: 3,
      percent: 67,
      questionIds: ["tf", "single", "multi"],
      answers: {},
      flagged: ["multi", "ghost"],
    });
    expect(saved.flagged).toEqual(["multi"]);
    const updated = await attemptStore.setAttemptFlags(saved.id, ["tf", "single"]);
    expect(updated.flagged).toEqual(["tf", "single"]);
    expect((await attemptStore.getAttempt(saved.id))?.flagged).toEqual(["tf", "single"]);
  });
});

describe("flags in a quiz session", () => {
  it("toggle only questions in the attempt", () => {
    useSessionStore.getState().start(makeQuiz(), {
      shuffleQuestions: false,
      shuffleChoices: false,
      revealMode: "after_each",
      questionCount: 0,
      timeLimitMinutes: null,
      selfMark: false,
    });
    const store = useSessionStore.getState();
    store.toggleFlag("single");
    store.toggleFlag("missing");
    expect(useSessionStore.getState().flagged).toEqual({ single: true });
    useSessionStore.getState().toggleFlag("single");
    expect(useSessionStore.getState().flagged).toEqual({});
  });

  it("sync from the phone, even after the answer is revealed", () => {
    const session = createMobileSession({
      quiz: makeQuiz(),
      revealMode: "after_each",
      order: ["tf", "single", "multi"],
      choicesOrder: {},
      currentIndex: 0,
      answers: { tf: false },
      submitted: { tf: true },
      flagged: {},
      selfMarks: {},
      selfMarking: false,
      theme: "light",
      deadlineAt: null,
    });
    const patch = { type: "flag", questionId: "tf", flagged: true } as const;
    expect(isMobilePatch(patch)).toBe(true);
    expect(isMobilePatch({ ...patch, flagged: "yes" })).toBe(false);
    expect(mobilePatchIssue(session, patch)).toBeNull();
    const flagged = applyMobilePatch(session, patch);
    expect(flagged.flagged).toEqual({ tf: true });
    expect(flagged.rev).toBe(session.rev + 1);
    expect(applyMobilePatch(flagged, patch)).toBe(flagged);
    expect(applyMobilePatch(flagged, { ...patch, flagged: false }).flagged).toEqual({});
    expect(mobilePatchIssue(session, { ...patch, questionId: "ghost" })).toMatch(/not in this quiz/);
  });
});

describe("attempt export", () => {
  it("marks flagged questions, including ones answered correctly", () => {
    const quiz = makeQuiz();
    const saved = attempt({ flagged: ["tf", "multi"] });
    const exported = buildAttemptExport(quiz, saved, quiz.questions);
    expect(exported.flaggedCount).toBe(2);
    expect(exported.questions.map((q) => [q.id, q.correct, q.flagged])).toEqual([
      ["tf", true, true],
      ["single", true, false],
      ["multi", false, true],
    ]);
  });

  it("treats attempts saved before flags existed as unflagged", () => {
    const quiz = makeQuiz();
    const all = buildAllAttemptsExport(quiz, [attempt()]);
    expect(all.attempts[0].flaggedCount).toBe(0);
    expect(all.attempts[0].questions.every((q) => q.flagged === false)).toBe(true);
  });
});
