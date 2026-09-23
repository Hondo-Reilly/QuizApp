import type { Quiz } from "@shared/types";

export function makeQuiz(): Quiz {
  return {
    schemaVersion: 1,
    id: "quiz-1",
    title: "Mixed questions",
    questions: [
      {
        id: "tf",
        type: "true_false",
        prompt: "The answer is false",
        answer: false,
      },
      {
        id: "single",
        type: "multiple_choice",
        prompt: "Pick B",
        choices: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
          { id: "c", text: "C" },
        ],
        answer: "b",
      },
      {
        id: "multi",
        type: "multi_answer",
        prompt: "Pick A and C",
        choices: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
          { id: "c", text: "C" },
        ],
        answers: ["a", "c"],
      },
    ],
  };
}
