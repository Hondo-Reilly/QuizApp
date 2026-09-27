import { describe, expect, it } from "vitest";
import {
  applyMobilePatch,
  createMobileSession,
  isMobilePatch,
  mobilePatchIssue,
} from "@shared/mobile";
import { gradeSoFar } from "@shared/grading";
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
    flagged: {},
    selfMarks: {},
    selfMarking: false,
    theme: "light" as const,
    liveGrade: false,
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

  it("syncs the live grade setting, even after the quiz is finished", () => {
    const finished = applyMobilePatch(createMobileSession(seed()), { type: "finish" });
    const on = applyMobilePatch(finished, { type: "liveGrade", liveGrade: true });
    expect(on.liveGrade).toBe(true);
    expect(on.rev).toBe(finished.rev + 1);
    expect(applyMobilePatch(on, { type: "liveGrade", liveGrade: true })).toBe(on);
    expect(isMobilePatch({ type: "liveGrade", liveGrade: "yes" })).toBe(false);
    expect(isMobilePatch({ type: "liveGrade", liveGrade: false, extra: 1 })).toBe(false);
  });

  it("scores only revealed questions for the live grade", () => {
    const quiz = makeQuiz();
    const answers = { tf: false, single: "a", multi: ["a", "c"] };
    expect(gradeSoFar(quiz.questions, answers, {})).toEqual({ correct: 0, graded: 0 });
    expect(gradeSoFar(quiz.questions, answers, { tf: true, single: true })).toEqual({
      correct: 1,
      graded: 2,
    });
  });

  it("rejects unrecognized patch shapes", () => {
    expect(isMobilePatch(null)).toBe(false);
    expect(isMobilePatch({ type: "unknown" })).toBe(false);
    expect(isMobilePatch({ type: "index", currentIndex: "2" })).toBe(false);
    expect(isMobilePatch({ type: "theme", theme: "blue" })).toBe(false);
    expect(isMobilePatch({ type: "answer", questionId: "tf", answer: false, extra: true })).toBe(
      false,
    );
    expect(isMobilePatch({ type: "finish", extra: true })).toBe(false);
  });

  it("rejects answers and submits that do not fit the question", () => {
    const initial = createMobileSession(seed());
    expect(
      mobilePatchIssue(initial, { type: "answer", questionId: "tf", answer: "no" }),
    ).toMatch(/does not match/);
    expect(
      applyMobilePatch(initial, { type: "answer", questionId: "tf", answer: "no" }),
    ).toBe(initial);
    expect(mobilePatchIssue(initial, { type: "submit", questionId: "tf" })).toMatch(
      /Choose an answer/,
    );
    expect(applyMobilePatch(initial, { type: "submit", questionId: "single" })).toBe(
      initial,
    );
    const answered = applyMobilePatch(initial, {
      type: "answer",
      questionId: "multi",
      answer: ["a", "a"],
    });
    expect(answered).toBe(initial);
    expect(
      mobilePatchIssue(initial, {
        type: "answer",
        questionId: "single",
        answer: "missing",
      }),
    ).toMatch(/does not match/);
    const chosen = applyMobilePatch(initial, {
      type: "answer",
      questionId: "single",
      answer: "b",
    });
    expect(mobilePatchIssue(chosen, { type: "submit", questionId: "single" })).toBeNull();
  });
});
