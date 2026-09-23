import { describe, expect, it } from "vitest";
import {
  applyMobilePatch,
  createMobileSession,
  isMobilePatch,
} from "@shared/mobile";
import { makeQuiz } from "./fixtures/quiz";

function seed() {
  return {
    quiz: makeQuiz(),
    revealMode: "after_each" as const,
    order: ["tf", "single", "multi"],
    choicesOrder: {},
    currentIndex: 99,
    answers: {},
    submitted: {},
    theme: "light" as const,
    deadlineAt: null,
  };
}

describe("mobile session state", () => {
  it("clamps the initial position and ignores an unknown question", () => {
    const initial = createMobileSession(seed());
    expect(initial.currentIndex).toBe(2);
    expect(initial.rev).toBe(1);
    expect(applyMobilePatch(initial, {
      type: "answer",
      questionId: "missing",
      answer: true,
    })).toBe(initial);
  });

  it("advances revisions for real changes but not repeated patches", () => {
    const initial = createMobileSession(seed());
    const answered = applyMobilePatch(initial, {
      type: "answer",
      questionId: "tf",
      answer: false,
    });
    expect(answered.answers.tf).toBe(false);
    expect(answered.rev).toBe(initial.rev + 1);
    expect(applyMobilePatch(answered, {
      type: "answer",
      questionId: "tf",
      answer: false,
    })).toBe(answered);
    const moved = applyMobilePatch(answered, { type: "index", currentIndex: -2 });
    expect(moved.currentIndex).toBe(0);
    expect(moved.rev).toBe(answered.rev + 1);
  });

  it("locks a submitted answer and finished session while allowing theme sync", () => {
    const initial = createMobileSession(seed());
    const answered = applyMobilePatch(initial, {
      type: "answer",
      questionId: "single",
      answer: "b",
    });
    const submitted = applyMobilePatch(answered, {
      type: "submit",
      questionId: "single",
    });
    expect(submitted.submitted.single).toBe(true);
    expect(applyMobilePatch(submitted, {
      type: "answer",
      questionId: "single",
      answer: "a",
    })).toBe(submitted);
    const finished = applyMobilePatch(submitted, { type: "finish" });
    expect(finished.finished).toBe(true);
    expect(applyMobilePatch(finished, { type: "index", currentIndex: 0 })).toBe(finished);
    const themed = applyMobilePatch(finished, { type: "theme", theme: "dark" });
    expect(themed.theme).toBe("dark");
    expect(themed.rev).toBe(finished.rev + 1);
  });

  it("rejects unrecognized patch shapes", () => {
    expect(isMobilePatch(null)).toBe(false);
    expect(isMobilePatch({ type: "unknown" })).toBe(false);
    expect(isMobilePatch({ type: "index", currentIndex: "2" })).toBe(false);
    expect(isMobilePatch({ type: "theme", theme: "blue" })).toBe(false);
  });
});
