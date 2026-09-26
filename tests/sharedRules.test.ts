import { describe, expect, it, vi } from "vitest";
import { countAnswered, hasAnswer } from "@shared/answers";
import { gradeQuestion, gradeQuiz } from "@shared/grading";
import { parseQuiz } from "@shared/schema";
import { shuffle } from "@shared/shuffle";
import { makeQuiz } from "./fixtures/quiz";

describe("quiz import validation", () => {
  it("accepts all supported question types", () => {
    const quiz = makeQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("rejects a duplicate choice ID", () => {
    const quiz = makeQuiz();
    const question = quiz.questions[1];
    if (question.type !== "multiple_choice") throw new Error("Bad fixture");
    question.choices[1].id = question.choices[0].id;
    expect(() => parseQuiz(quiz)).toThrow();
  });

  it("rejects an answer that does not reference a choice", () => {
    const quiz = makeQuiz();
    const single = quiz.questions[1];
    const multi = quiz.questions[2];
    if (single.type !== "multiple_choice" || multi.type !== "multi_answer") {
      throw new Error("Bad fixture");
    }
    single.answer = "missing";
    expect(() => parseQuiz(quiz)).toThrow();
    single.answer = "b";
    multi.answers = ["a", "missing"];
    expect(() => parseQuiz(quiz)).toThrow();
  });

  it("rejects a repeated question id and names it", () => {
    const quiz = makeQuiz();
    quiz.questions[1].id = quiz.questions[0].id;
    expect(() => parseQuiz(quiz)).toThrow(/Duplicate question id \\"tf\\"/);
  });

  it("rejects repeated answers in a multi-answer question", () => {
    const quiz = makeQuiz();
    const question = quiz.questions[2];
    if (question.type !== "multi_answer") throw new Error("Bad fixture");
    question.answers = ["a", "a"];
    expect(() => parseQuiz(quiz)).toThrow();
  });
});

describe("grading and answer counts", () => {
  const [tf, single, multi] = makeQuiz().questions;

  it("treats false as a real answer and empty multi-select as unanswered", () => {
    expect(hasAnswer(false)).toBe(true);
    expect(hasAnswer([])).toBe(false);
    expect(hasAnswer(null)).toBe(false);
    expect(countAnswered(["tf", "single", "multi"], {
      tf: false,
      single: null,
      multi: [],
    })).toBe(1);
  });

  it("grades each type and ignores multi-answer selection order", () => {
    expect(gradeQuestion(tf, false)).toBe(true);
    expect(gradeQuestion(tf, true)).toBe(false);
    expect(gradeQuestion(single, "b")).toBe(true);
    expect(gradeQuestion(single, "a")).toBe(false);
    expect(gradeQuestion(multi, ["c", "a"])).toBe(true);
    expect(gradeQuestion(multi, ["a"])).toBe(false);
    expect(gradeQuestion(multi, ["a", "b"])).toBe(false);
  });

  it("preserves result order and rounds the score", () => {
    expect(gradeQuiz([tf, single, multi], {
      tf: false,
      single: "a",
      multi: null,
    })).toEqual({
      total: 3,
      correct: 1,
      percent: 33,
      ungraded: 0,
      results: [
        { questionId: "tf", userAnswer: false, correct: true, outcome: "correct" },
        { questionId: "single", userAnswer: "a", correct: false, outcome: "wrong" },
        { questionId: "multi", userAnswer: null, correct: false, outcome: "wrong" },
      ],
    });
    expect(gradeQuiz([], {})).toMatchObject({ total: 0, percent: 0 });
  });
});

describe("shuffle", () => {
  it("returns a permutation without mutating the input", () => {
    const input = Object.freeze(["a", "b", "c", "d"]);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = shuffle(input);
    expect(result).not.toBe(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});
