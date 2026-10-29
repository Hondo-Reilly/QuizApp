import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAnswered } from "@shared/answers";
import { formatScore, gradeQuiz, gradeSoFar, questionCredit, questionOutcome } from "@shared/grading";
import { choiceLetter, withMatch } from "@shared/matching";
import { applyMobilePatch, createMobileSession, mobilePatchIssue, sameAnswer } from "@shared/mobile";
import {
  describeNumericAnswer,
  isNumericCorrect,
  parseNumericAnswer,
} from "@shared/numeric";
import { markdownFields } from "@shared/quizContent";
import { parseQuiz } from "@shared/schema";
import type { MatchingQuestion, NumericQuestion, Quiz } from "@shared/types";

function numeric(extra: Partial<NumericQuestion> = {}): NumericQuestion {
  return { id: "n", type: "numeric", prompt: "How much?", answer: 10, ...extra };
}

function matching(extra: Partial<MatchingQuestion> = {}): MatchingQuestion {
  return {
    id: "m",
    type: "matching",
    prompt: "Match",
    items: [
      { id: "1", text: "One", answer: "a" },
      { id: "2", text: "Two", answer: "b" },
      { id: "3", text: "Three", answer: "c" },
      { id: "4", text: "Four", answer: "d" },
    ],
    choices: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id.toUpperCase() })),
    ...extra,
  };
}

function quizOf(...questions: Quiz["questions"]): Quiz {
  return { schemaVersion: 2, id: "q", title: "Q", questions };
}

describe("numeric answers", () => {
  it("reads commas, currency symbols, units, and scientific notation", () => {
    const money = numeric({ currency: "USD" });
    expect(parseNumericAnswer("$1,250.50", money)).toBe(1250.5);
    expect(parseNumericAnswer(" 1 250 ", money)).toBe(1250);
    expect(parseNumericAnswer("USD 12", money)).toBe(12);
    expect(parseNumericAnswer("-3e2", numeric())).toBe(-300);
    expect(parseNumericAnswer("4.5 mm", numeric({ unit: "mm" }))).toBe(4.5);
    expect(parseNumericAnswer("12,5", numeric())).toBeNull();
    expect(parseNumericAnswer("ten", numeric())).toBeNull();
    expect(parseNumericAnswer("", numeric())).toBeNull();
  });

  it("is correct within the tolerance, inclusive", () => {
    const question = numeric({ tolerance: 0.5 });
    expect(isNumericCorrect(question, "10.5")).toBe(true);
    expect(isNumericCorrect(question, "9.5")).toBe(true);
    expect(isNumericCorrect(question, "10.51")).toBe(false);
    expect(isNumericCorrect(numeric(), "10")).toBe(true);
    expect(isNumericCorrect(numeric(), "10.0001")).toBe(false);
    expect(isNumericCorrect(numeric({ answer: 0.3 }), String(0.1 + 0.2))).toBe(true);
  });

  it("shows the answer as money or with its unit", () => {
    expect(describeNumericAnswer(numeric({ answer: 12.5, tolerance: 0.1, currency: "USD" }))).toBe(
      "$12.50 ± $0.10",
    );
    expect(describeNumericAnswer(numeric({ answer: 1184.5, unit: "mm" }))).toBe("1,184.5 mm");
  });

  it("can only be submitted once it reads as a number", () => {
    expect(isAnswered(numeric(), "abc")).toBe(false);
    expect(isAnswered(numeric(), "9")).toBe(true);
  });

  it("validates currency and units on import", () => {
    expect(() => parseQuiz(quizOf(numeric({ currency: "USD", tolerance: 0.01 })))).not.toThrow();
    expect(() => parseQuiz(quizOf(numeric({ currency: "usd" })))).toThrow(/ISO 4217/);
    expect(() => parseQuiz(quizOf(numeric({ tolerance: -1 })))).toThrow();
    expect(() => parseQuiz(quizOf(numeric({ currency: "USD", unit: "mm" })))).toThrow(/not both/);
    expect(() => parseQuiz({ ...quizOf(numeric()), schemaVersion: 1 })).toThrow(/schemaVersion 2/);
  });
});

describe("matching answers", () => {
  it("earns the share of items matched", () => {
    const question = matching();
    const answer = { matches: { "1": "a", "2": "b", "3": "d" } };
    expect(questionCredit(question, answer)).toBe(0.5);
    expect(questionOutcome(question, answer)).toBe("partial");
    expect(questionOutcome(question, { matches: { "1": "a", "2": "b", "3": "c", "4": "d" } })).toBe("correct");
    expect(questionOutcome(question, null)).toBe("wrong");
  });

  it("adds partial credit to the quiz score", () => {
    const grade = gradeQuiz([matching(), numeric()], {
      m: { matches: { "1": "a", "2": "b", "3": "c" } },
      n: "10",
    });
    expect(grade.correct).toBe(1.75);
    expect(grade.total).toBe(2);
    expect(grade.percent).toBe(88);
    expect(formatScore(grade.correct)).toBe("1.75");
    expect(gradeSoFar([matching()], { m: { matches: { "1": "a" } } }, { m: true })).toEqual({
      correct: 0.25,
      graded: 1,
    });
  });

  it("moves a used choice unless choices may be reused", () => {
    const once = matching();
    const first = withMatch(once, null, "1", "a");
    expect(withMatch(once, first, "2", "a")).toEqual({ matches: { "2": "a" } });
    const reuse = matching({ reuseChoices: true });
    expect(withMatch(reuse, first, "2", "a")).toEqual({ matches: { "1": "a", "2": "a" } });
    expect(withMatch(once, first, "1", "")).toBeNull();
  });

  it("needs every item matched before submitting", () => {
    expect(isAnswered(matching(), { matches: { "1": "a" } })).toBe(false);
    expect(isAnswered(matching(), { matches: { "1": "a", "2": "b", "3": "c", "4": "e" } })).toBe(true);
  });

  it("validates the choice bank on import", () => {
    expect(() => parseQuiz(quizOf(matching()))).not.toThrow();
    const shared = matching();
    shared.items[1].answer = "a";
    expect(() => parseQuiz(quizOf(shared))).toThrow(/reuseChoices/);
    expect(() => parseQuiz(quizOf({ ...shared, reuseChoices: true }))).not.toThrow();
    const missing = matching();
    missing.items[0].answer = "zz";
    expect(() => parseQuiz(quizOf(missing))).toThrow(/choice ids/);
  });

  it("letters long banks past Z", () => {
    expect(choiceLetter(0)).toBe("A");
    expect(choiceLetter(25)).toBe("Z");
    expect(choiceLetter(26)).toBe("AA");
  });

  it("includes items and choices as Markdown fields", () => {
    const fields = markdownFields({ questions: [matching()] });
    expect(fields).toContain("One");
    expect(fields).toContain("E");
  });
});

describe("mobile sync", () => {
  const quiz = quizOf(matching(), numeric());
  const session = () =>
    createMobileSession({
      quiz,
      revealMode: "at_end",
      order: ["m", "n"],
      choicesOrder: {},
      currentIndex: 0,
      answers: {},
      submitted: {},
      flagged: {},
      selfMarks: {},
      selfMarking: false,
      theme: "light",
      liveGrade: false,
      deadlineAt: null,
    });

  it("accepts valid matching and numeric answers", () => {
    const answer = { matches: { "1": "a" } };
    const next = applyMobilePatch(session(), { type: "answer", questionId: "m", answer });
    expect(next.answers.m).toEqual(answer);
    expect(sameAnswer(answer, { matches: { "1": "a" } })).toBe(true);
    expect(sameAnswer(answer, { matches: { "1": "b" } })).toBe(false);
    expect(mobilePatchIssue(session(), { type: "answer", questionId: "n", answer: "12.5" })).toBeNull();
  });

  it("rejects matches to unknown choices or a reused choice", () => {
    expect(
      mobilePatchIssue(session(), { type: "answer", questionId: "m", answer: { matches: { "1": "zz" } } }),
    ).not.toBeNull();
    expect(
      mobilePatchIssue(session(), {
        type: "answer",
        questionId: "m",
        answer: { matches: { "1": "a", "2": "a" } },
      }),
    ).not.toBeNull();
  });
});

describe("sample quiz", () => {
  it("imports the numeric and matching demo", () => {
    const raw = JSON.parse(readFileSync("sample-quizzes/numeric-matching-demo.quiz.json", "utf8"));
    expect(() => parseQuiz(raw)).not.toThrow();
  });
});
