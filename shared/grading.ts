import { countCorrectMatches, isMatchingCorrect } from "./matching";
import { isNumericCorrect } from "./numeric";
import { isOpenQuestion } from "./questionTypes";
import type {
  AttemptScore,
  Question,
  QuestionOutcome,
  QuizGrade,
  SelfMark,
  UserAnswer,
} from "./types";

/**
 * Whether an auto-graded question is fully right. Open questions are never
 * correct here, and a matching answer needs every item matched.
 */
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
    case "numeric":
      return typeof userAnswer === "string" && isNumericCorrect(question, userAnswer);
    case "matching":
      return isMatchingCorrect(question, userAnswer);
    case "short_answer":
    case "long_answer":
    case "image_response":
      return false;
  }
}

// Scores keep two decimals, so partial matching credit adds up without float noise.
function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The share of a question earned, 0 to 1, or null when it has no grade.
 * Matching earns the share of items matched; open answers count when self-marked.
 */
export function questionCredit(
  question: Question,
  userAnswer: UserAnswer,
  selfMark?: SelfMark,
): number | null {
  if (isOpenQuestion(question)) {
    if (selfMark === "got") return 1;
    if (selfMark === "missed") return 0;
    return null;
  }
  if (question.type === "matching") {
    return roundScore(countCorrectMatches(question, userAnswer) / question.items.length);
  }
  return gradeQuestion(question, userAnswer) ? 1 : 0;
}

function outcomeOf(credit: number | null): QuestionOutcome {
  if (credit === null) return "ungraded";
  if (credit >= 1) return "correct";
  return credit > 0 ? "partial" : "wrong";
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
  return outcomeOf(questionCredit(question, userAnswer, selfMark));
}

export function gradeQuiz(
  questions: readonly Question[],
  answers: Record<string, UserAnswer>,
  selfMarks: Record<string, SelfMark> = {},
): QuizGrade {
  const results = questions.map((q) => {
    const userAnswer = answers[q.id] ?? null;
    const credit = questionCredit(q, userAnswer, selfMarks[q.id]);
    const outcome = outcomeOf(credit);
    return { questionId: q.id, userAnswer, outcome, credit, correct: outcome === "correct" };
  });
  const correct = roundScore(results.reduce((sum, r) => sum + (r.credit ?? 0), 0));
  const ungraded = results.filter((r) => r.outcome === "ungraded").length;
  const total = results.length - ungraded;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent, ungraded, results };
}

/**
 * The score so far in an "after each question" quiz: revealed questions only,
 * leaving out open answers that have no result yet.
 */
export function gradeSoFar(
  questions: readonly Question[],
  answers: Record<string, UserAnswer>,
  submitted: Record<string, boolean>,
  selfMarks: Record<string, SelfMark> = {},
): { correct: number; graded: number } {
  let correct = 0;
  let graded = 0;
  for (const q of questions) {
    if (!submitted[q.id]) continue;
    const credit = questionCredit(q, answers[q.id] ?? null, selfMarks[q.id]);
    if (credit === null) continue;
    graded += 1;
    correct += credit;
  }
  return { correct: roundScore(correct), graded };
}

/** A score count for display: whole numbers as is, partial credit to two decimals. */
export function formatScore(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function scoreOf(grade: QuizGrade): AttemptScore {
  return {
    correct: grade.correct,
    total: grade.total,
    percent: grade.percent,
    ungraded: grade.ungraded,
  };
}
