import { isOpenQuestion } from "./questionTypes";
import type {
  AttemptScore,
  Question,
  QuestionOutcome,
  QuizGrade,
  SelfMark,
  UserAnswer,
} from "./types";

/** Auto-grades a choice or true/false question. Open questions are never correct here. */
export function gradeQuestion(question: Question, userAnswer: UserAnswer): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;

  switch (question.type) {
    case "true_false":
      return userAnswer === question.answer;
    case "multiple_choice":
      return userAnswer === question.answer;
    case "multi_answer": {
      if (!Array.isArray(userAnswer)) return false;
      const expected = new Set(question.answers);
      const actual = new Set(userAnswer);
      if (expected.size !== actual.size) return false;
      for (const id of expected) if (!actual.has(id)) return false;
      return true;
    }
    case "short_answer":
    case "long_answer":
    case "image_response":
      return false;
  }
}

/**
 * The result of one question. Open answers are ungraded unless the user marked
 * them "got" or "missed"; "unsure" stays ungraded.
 */
export function questionOutcome(
  question: Question,
  userAnswer: UserAnswer,
  selfMark?: SelfMark,
): QuestionOutcome {
  if (isOpenQuestion(question)) {
    if (selfMark === "got") return "correct";
    if (selfMark === "missed") return "wrong";
    return "ungraded";
  }
  return gradeQuestion(question, userAnswer) ? "correct" : "wrong";
}

export function gradeQuiz(
  questions: readonly Question[],
  answers: Record<string, UserAnswer>,
  selfMarks: Record<string, SelfMark> = {},
): QuizGrade {
  const results = questions.map((q) => {
    const userAnswer = answers[q.id] ?? null;
    const outcome = questionOutcome(q, userAnswer, selfMarks[q.id]);
    return { questionId: q.id, userAnswer, outcome, correct: outcome === "correct" };
  });
  const correct = results.filter((r) => r.outcome === "correct").length;
  const ungraded = results.filter((r) => r.outcome === "ungraded").length;
  const total = results.length - ungraded;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent, ungraded, results };
}

export function scoreOf(grade: QuizGrade): AttemptScore {
  return {
    correct: grade.correct,
    total: grade.total,
    percent: grade.percent,
    ungraded: grade.ungraded,
  };
}
