import { describe, expect, it } from "vitest";
import { quizSuggestions } from "@shared/quizSuggestions";
import type { Question, Quiz } from "@shared/types";

const quizOf = (questions: Question[]): Quiz => ({ schemaVersion: 2, id: "s", title: "S", questions });

const mc = (id: string, answer: string, explanation = "Because."): Question => ({
  id,
  type: "multiple_choice",
  prompt: `Prompt ${id}`,
  choices: ["a", "b", "c", "d"].map((choiceId) => ({ id: choiceId, text: choiceId })),
  answer,
  explanation,
});

describe("quiz suggestions", () => {
  it("has nothing to say about a balanced, explained quiz", () => {
    expect(quizSuggestions(quizOf([mc("q1", "a"), mc("q2", "b"), mc("q3", "c"), mc("q4", "d")]))).toEqual([]);
  });

  it("lists questions with no explanation, but not written ones", () => {
    const suggestions = quizSuggestions(
      quizOf([mc("q1", "a", ""), mc("q2", "b"), mc("q3", "c", " "), { id: "q4", type: "short_answer", prompt: "W", sampleAnswer: "S" }]),
    );
    expect(suggestions).toEqual([
      { questionId: "q1", message: "Questions 1 and 3 have no explanation. An explanation is where people learn from a wrong answer." },
    ]);
  });

  it("notices written questions with no sample answer", () => {
    const [suggestion] = quizSuggestions(quizOf([{ id: "w", type: "long_answer", prompt: "Explain." }]));
    expect(suggestion).toEqual({ questionId: "w", message: "Question 1 has no sample answer, so there's nothing to compare an answer with." });
  });

  it("points out the correct answer sitting in one place", () => {
    const [suggestion] = quizSuggestions(quizOf([mc("q1", "b"), mc("q2", "b"), mc("q3", "b"), mc("q4", "a")]));
    expect(suggestion.message).toMatch(/^The correct answer is choice B in 3 of 4 multiple-choice questions/);
    expect(quizSuggestions(quizOf([mc("q1", "b"), mc("q2", "b"), mc("q3", "b")]))).toEqual([]);
  });

  it("points out true/false answers that are all the same", () => {
    const tf = (id: string): Question => ({ id, type: "true_false", prompt: `TF ${id}`, answer: true, explanation: "E" });
    const [suggestion] = quizSuggestions(quizOf(["1", "2", "3", "4"].map(tf)));
    expect(suggestion.message).toBe("All 4 true/false answers are True, which makes them easy to guess.");
  });

  it("suggests distractors for matching that can be solved by elimination", () => {
    const matching: Question = {
      id: "m",
      type: "matching",
      prompt: "Match",
      explanation: "E",
      items: [
        { id: "1", text: "x", answer: "a" },
        { id: "2", text: "y", answer: "b" },
      ],
      choices: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
    };
    expect(quizSuggestions(quizOf([matching]))[0].message).toMatch(/^Question 1 has no extra statements/);
    expect(quizSuggestions(quizOf([{ ...matching, choices: [...matching.choices, { id: "c", text: "C" }] }]))).toEqual([]);
    expect(quizSuggestions(quizOf([{ ...matching, reuseChoices: true }]))).toEqual([]);
  });

  it("notices repeated prompts", () => {
    const second = { ...mc("q2", "b"), prompt: "  prompt  Q1 " };
    expect(quizSuggestions(quizOf([mc("q1", "a"), second]))).toEqual([
      { questionId: "q2", message: "Questions 1 and 2 have the same prompt." },
    ]);
  });
});
