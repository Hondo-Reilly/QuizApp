import { strToU8, zipSync, type Zippable } from "fflate";
import { quizApi } from "@/api/quizApi";
import { flaggedIds } from "@shared/attemptFlags";
import { attemptPhotoNames } from "@shared/attemptRecord";
import { questionOutcome } from "@shared/grading";
import { isPhotoAnswer } from "@shared/questionTypes";
import { imageRefs } from "@shared/quizContent";
import type {
  Question,
  QuestionOutcome,
  Quiz,
  QuizAttempt,
  Scenario,
  SelfMark,
  TextFormat,
  UserAnswer,
} from "@shared/types";

/** Where a photo response sits inside an .attempt package. */
export function exportedPhotoPath(attemptId: string, name: string): string {
  return `responses/${attemptId}/${name}`;
}

export type ExportedQuestion = Question & {
  /** For photo answers, `{ photos: [...] }` holds paths inside the .attempt package. */
  selected: UserAnswer;
  /** Null when the answer has no grade: a written or photo answer without a self-mark. */
  correct: boolean | null;
  outcome: QuestionOutcome;
  /** How the user marked their own written or photo answer. */
  selfMark?: SelfMark;
  /** The user marked this question to study, whether or not they got it right. */
  flagged: boolean;
};

export interface ExportedAttempt {
  id: string;
  completedAt: string;
  correct: number;
  wrong: number;
  /** Written and photo answers without a grade; not in correct, wrong, or percent. */
  ungraded: number;
  percent: number | null;
  selfMarking: boolean;
  flaggedCount: number;
  questions: ExportedQuestion[];
}

export interface AttemptExport {
  schemaVersion: 2;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  textFormat?: TextFormat;
  scenarios?: Scenario[];
  completedAt: string;
  correct: number;
  wrong: number;
  ungraded: number;
  percent: number | null;
  selfMarking: boolean;
  flaggedCount: number;
  questions: ExportedQuestion[];
}

export interface AllAttemptsExport {
  schemaVersion: 2;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  textFormat?: TextFormat;
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
  const flagged = new Set(flaggedIds(attempt));
  const marks = attempt.selfMarking ? (attempt.selfMarks ?? {}) : {};
  return questions.map((question) => {
    const answer = attempt.answers[question.id] ?? null;
    const outcome = questionOutcome(question, answer, marks[question.id]);
    const selected = isPhotoAnswer(answer)
      ? { photos: answer.photos.map((name) => exportedPhotoPath(attempt.id, name)) }
      : answer;
    return {
      ...question,
      selected,
      correct: outcome === "ungraded" ? null : outcome === "correct",
      outcome,
      ...(marks[question.id] ? { selfMark: marks[question.id] } : {}),
      flagged: flagged.has(question.id),
    };
  });
}

function exportAttempt(attempt: QuizAttempt, questions: readonly Question[]): ExportedAttempt {
  const exported = exportQuestions(attempt, questions);
  return {
    id: attempt.id,
    completedAt: attempt.completedAt,
    correct: attempt.correct,
    wrong: Math.max(0, attempt.total - attempt.correct),
    ungraded: attempt.ungraded ?? 0,
    percent: attempt.total > 0 ? attempt.percent : null,
    selfMarking: !!attempt.selfMarking,
    flaggedCount: exported.filter((question) => question.flagged).length,
    questions: exported,
  };
}

export function buildAttemptExport(
  quiz: Quiz,
  attempt: QuizAttempt,
  questions: readonly Question[],
): AttemptExport {
  const exported = exportAttempt(attempt, questions);
  return {
    schemaVersion: 2,
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    textFormat: quiz.textFormat,
    scenarios: quiz.scenarios,
    completedAt: exported.completedAt,
    correct: exported.correct,
    wrong: exported.wrong,
    ungraded: exported.ungraded,
    percent: exported.percent,
    selfMarking: exported.selfMarking,
    flaggedCount: exported.flaggedCount,
    questions: exported.questions,
  };
}

export function buildAllAttemptsExport(
  quiz: Quiz,
  attempts: readonly QuizAttempt[],
): AllAttemptsExport {
  return {
    schemaVersion: 2,
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    textFormat: quiz.textFormat,
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

function hasPhotos(attempts: readonly QuizAttempt[]): boolean {
  return attempts.some((attempt) => attemptPhotoNames(attempt).length > 0);
}

export function attemptExportFilename(title: string, completedAt: string): string {
  return `${slugify(title)}-${completedAt.slice(0, 10)}.json`;
}

export function allAttemptsExportFilename(title: string): string {
  return `${slugify(title)}-attempts.json`;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * An .attempt package: attempt.json, the photo responses under responses/, and
 * the quiz's own images under images/ so a reviewer sees what each question showed.
 */
async function buildAttemptPackage(
  quiz: Quiz,
  attempts: readonly QuizAttempt[],
  data: unknown,
): Promise<Uint8Array> {
  const files: Zippable = {
    "attempt.json": strToU8(`${JSON.stringify(data, null, 2)}\n`),
  };
  for (const attempt of attempts) {
    const names = attemptPhotoNames(attempt);
    if (names.length === 0) continue;
    const urls = await quizApi.getAttemptPhotoUrls(attempt.id, names);
    for (const name of names) {
      const bytes = urls[name] ? await fetchBytes(urls[name]) : null;
      if (!bytes) throw new Error(`A photo from this attempt is missing (${name}).`);
      files[exportedPhotoPath(attempt.id, name)] = [bytes, { level: 0 }];
    }
  }
  const images = imageRefs(quiz);
  if (images.length > 0) {
    const urls = await quizApi.getQuizAssetUrls(quiz.id, images);
    for (const path of images) {
      const bytes = urls[path] ? await fetchBytes(urls[path]) : null;
      if (bytes) files[path] = [bytes, { level: 0 }];
    }
  }
  return zipSync(files, { level: 6 });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads one attempt, or several, as JSON. Attempts with photo answers are
 * saved as an .attempt package instead, since JSON can't carry the photos.
 */
export async function downloadAttemptExport(
  quiz: Quiz,
  attempts: readonly QuizAttempt[],
  single: boolean,
): Promise<void> {
  const data =
    single && attempts.length === 1
      ? buildAttemptExport(quiz, attempts[0], questionsForAttempt(quiz, attempts[0]))
      : buildAllAttemptsExport(quiz, attempts);
  const jsonName =
    single && attempts.length === 1
      ? attemptExportFilename(quiz.title, attempts[0].completedAt)
      : allAttemptsExportFilename(quiz.title);
  if (!hasPhotos(attempts)) {
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      jsonName,
    );
    return;
  }
  const bytes = await buildAttemptPackage(quiz, attempts, data);
  downloadBlob(
    new Blob([bytes as BlobPart], { type: "application/zip" }),
    jsonName.replace(/\.json$/, ATTEMPT_PACKAGE_EXTENSION),
  );
}

export const ATTEMPT_PACKAGE_EXTENSION = ".attempt";
