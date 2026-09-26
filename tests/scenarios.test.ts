import { describe, expect, it } from "vitest";
import { parseQuiz } from "@shared/schema";
import { scenarioBlocks, scenarioFor, startsScenario } from "@shared/scenarios";
import { useSessionStore } from "@/state/sessionStore";
import type { Quiz } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

function makeScenarioQuiz(): Quiz {
  const quiz = makeQuiz();
  quiz.scenarios = [
    { id: "case-1", title: "Case Study 1", text: "Shared details." },
  ];
  quiz.questions[1].scenarioId = "case-1";
  quiz.questions[2].scenarioId = "case-1";
  return quiz;
}

describe("scenarios", () => {
  it("keeps quizzes without scenarios valid", () => {
    const quiz = makeQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("keeps scenarios and question links when parsing", () => {
    const quiz = makeScenarioQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("rejects a scenarioId with no matching scenario", () => {
    const quiz = makeScenarioQuiz();
    quiz.questions[0].scenarioId = "missing";
    expect(() => parseQuiz(quiz)).toThrow(/scenarioId \\"missing\\"/);
  });

  it("rejects a duplicate scenario id", () => {
    const quiz = makeScenarioQuiz();
    quiz.scenarios!.push({ id: "case-1", text: "Again." });
    expect(() => parseQuiz(quiz)).toThrow(/Duplicate scenario id/);
  });

  it("finds a question's scenario", () => {
    const quiz = makeScenarioQuiz();
    expect(scenarioFor(quiz, quiz.questions[0])).toBeUndefined();
    expect(scenarioFor(quiz, quiz.questions[1])?.title).toBe("Case Study 1");
  });

  it("shows a scenario only where its run of questions starts", () => {
    const { questions } = makeScenarioQuiz();
    expect(questions.map((_, i) => startsScenario(questions, i))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("groups a scenario's questions into one block", () => {
    const blocks = scenarioBlocks(makeScenarioQuiz().questions);
    expect(blocks.map((block) => block.map((q) => q.id))).toEqual([
      ["tf"],
      ["single", "multi"],
    ]);
  });

  it("keeps a scenario's questions together when shuffled", () => {
    const quiz = makeScenarioQuiz();
    for (let run = 0; run < 20; run += 1) {
      useSessionStore.getState().start(quiz, {
        shuffleQuestions: true,
        shuffleChoices: false,
        revealMode: "at_end",
        questionCount: 0,
        timeLimitMinutes: null,
      });
      const order = useSessionStore.getState().order;
      expect(order.indexOf("multi") - order.indexOf("single")).toBe(1);
    }
  });
});
