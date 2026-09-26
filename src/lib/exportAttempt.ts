import { gradeQuestion } from "@shared/grading";
import type { Question, Quiz, QuizAttempt, Scenario, UserAnswer } from "@shared/types";

export type ExportedQuestion = Question & {
  selected: UserAnswer;
  correct: boolean;
};

export interface ExportedAttempt {
  id: string;
  completedAt: string;
  correct: number;
  wrong: number;
  percent: number;
  questions: ExportedQuestion[];
}

export interface AttemptExport {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  scenarios?: Scenario[];
  completedAt: string;
  correct: number;
  wrong: number;
  percent: number;
  questions: ExportedQuestion[];
}

export interface AllAttemptsExport {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  scenarios?: Scenario[];
  attempts: ExportedAttempt[];
}

function questionsForAttempt(quiz: Quiz, attempt: QuizAttempt): Question[] {
  const byId = new Map(quiz.questions.map((question) => [question.id, question]));
  return attempt.questionIds
    .map((questionId) => byId.get(questionId))
    .filter((question): question is Question => !!question);
}

function exportQuestions(
  attempt: QuizAttempt,
  questions: readonly Question[],
): ExportedQuestion[] {
  return questions.map((question) => {
    const selected = attempt.answers[question.id] ?? null;
    return {
      ...question,
      selected,
      correct: gradeQuestion(question, selected),
    };
  });
}

function exportAttempt(attempt: QuizAttempt, questions: readonly Question[]): ExportedAttempt {
  return {
    id: attempt.id,
    completedAt: attempt.completedAt,
    correct: attempt.correct,
    wrong: Math.max(0, attempt.total - attempt.correct),
    percent: attempt.percent,
    questions: exportQuestions(attempt, questions),
  };
}

export function buildAttemptExport(
  quiz: Quiz,
  attempt: QuizAttempt,
  questions: readonly Question[],
): AttemptExport {
  const exported = exportAttempt(attempt, questions);
  return {
    schemaVersion: 1,
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    scenarios: quiz.scenarios,
    completedAt: exported.completedAt,
    correct: exported.correct,
    wrong: exported.wrong,
    percent: exported.percent,
    questions: exported.questions,
  };
}

export function buildAllAttemptsExport(
  quiz: Quiz,
  attempts: readonly QuizAttempt[],
): AllAttemptsExport {
  return {
    schemaVersion: 1,
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    scenarios: quiz.scenarios,
    attempts: attempts.map((attempt) =>
      exportAttempt(attempt, questionsForAttempt(quiz, attempt)),
    ),
  };
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "quiz"
  );
}

export function attemptExportFilename(title: string, completedAt: string): string {
  return `${slugify(title)}-${completedAt.slice(0, 10)}.json`;
}

export function allAttemptsExportFilename(title: string): string {
  return `${slugify(title)}-attempts.json`;
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
