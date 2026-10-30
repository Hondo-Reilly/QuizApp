import exampleQuizText from "../../sample-quizzes/example.quiz.json?raw";
import { imageRefs } from "@shared/quizContent";
import { describeIssue, quizIssues } from "@shared/quizIssues";
import { quizSchema } from "@shared/schema";
import type { Quiz } from "@shared/types";

/**
 * Reads quiz JSON to start a new quiz in the editor. It must pass the import
 * rules, and can't use images, since pasted text has no image files.
 */
export function quizFromJson(text: string): Quiz {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That isn't valid JSON. Paste the whole quiz, from { to }.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("That isn't a quiz.");
  if (!Array.isArray((raw as { questions?: unknown }).questions)) {
    throw new Error("A quiz needs a questions list.");
  }
  const candidate = { ...raw, schemaVersion: 2, id: undefined } as unknown as Quiz;
  if (imageRefs(candidate).length > 0) {
    throw new Error("This quiz uses images. Use Import quiz with its .quiz package instead.");
  }
  if (!quizSchema.safeParse(candidate).success) {
    const issues = quizIssues({ ...candidate, id: "" });
    throw new Error(issues[0] ? describeIssue(candidate, issues[0]) : "That quiz doesn't match the quiz format.");
  }
  return { ...candidate, id: "" };
}

/** The example quiz from Download Example Quiz, to start from. */
export function exampleQuiz(): Quiz {
  return quizFromJson(exampleQuizText);
}
