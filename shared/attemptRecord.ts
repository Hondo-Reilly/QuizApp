import { cleanFlags } from "./attemptFlags";
import { isPhotoName, photosOf } from "./questionTypes";
import { isSelfMark } from "./selfMarks";
import type {
  AttemptPhoto,
  AttemptScore,
  AttemptSnapshot,
  Question,
  Quiz,
  QuizAttempt,
  SaveAttemptInput,
  SelfMark,
} from "./types";

const ATTEMPT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Attempt ids name photo folders and storage keys, so they must be simple. */
export function isSafeAttemptId(id: string): boolean {
  return ATTEMPT_ID.test(id);
}

function cleanSelfMarks(
  marks: Record<string, unknown> | undefined,
  questionIds: readonly string[],
): Record<string, SelfMark> {
  const out: Record<string, SelfMark> = {};
  for (const id of questionIds) {
    const mark = marks?.[id];
    if (isSelfMark(mark)) out[id] = mark;
  }
  return out;
}

/** Every photo file name an attempt's answers refer to. */
export function attemptPhotoNames(attempt: Pick<QuizAttempt, "answers">): string[] {
  const names = new Set<string>();
  for (const answer of Object.values(attempt.answers)) {
    for (const name of photosOf(answer)) if (isPhotoName(name)) names.add(name);
  }
  return [...names];
}

/**
 * Builds the stored attempt from what the quiz saved, and picks out the photos
 * it actually refers to. Photo data is stored beside the record, never in it.
 */
export function buildAttempt(
  id: string,
  completedAt: string,
  input: SaveAttemptInput,
): { attempt: QuizAttempt; photos: AttemptPhoto[] } {
  const attempt: QuizAttempt = {
    id,
    quizId: input.quizId,
    startedAt: input.startedAt,
    completedAt,
    correct: input.correct,
    total: input.total,
    percent: input.percent,
    ungraded: input.ungraded ?? 0,
    questionIds: input.questionIds,
    answers: input.answers,
    flagged: cleanFlags(input.flagged ?? [], input.questionIds),
  };
  if (input.selfMarking) {
    attempt.selfMarking = true;
    attempt.selfMarks = cleanSelfMarks(input.selfMarks, input.questionIds);
  }
  const wanted = new Set(attemptPhotoNames(attempt));
  const photos = (input.photos ?? []).filter((photo) => wanted.has(photo.name));
  const missing = [...wanted].filter((name) => !photos.some((photo) => photo.name === name));
  if (missing.length > 0) throw new Error(`Missing photo ${missing[0]} for this attempt.`);
  return { attempt, photos };
}

/** Returns the attempt with new self-marks and score, or throws if it is not in the list. */
export function withAttemptSelfMarks(
  attempts: readonly QuizAttempt[],
  attemptId: string,
  selfMarks: Record<string, unknown>,
  score: AttemptScore,
): { attempts: QuizAttempt[]; attempt: QuizAttempt } {
  const index = attempts.findIndex((item) => item.id === attemptId);
  if (index === -1) throw new Error("Attempt not found");
  const current = attempts[index];
  if (!current.selfMarking) throw new Error("Self-marking is off for this attempt.");
  const attempt: QuizAttempt = {
    ...current,
    selfMarks: cleanSelfMarks(selfMarks, current.questionIds),
    correct: score.correct,
    total: score.total,
    percent: score.percent,
    ungraded: score.ungraded,
  };
  const next = attempts.slice();
  next[index] = attempt;
  return { attempts: next, attempt };
}

/** What an attempt asked from a quiz: its questions in order, their scenarios, and the text format. */
function askedContent(quiz: Quiz, questionIds: readonly string[]): AttemptSnapshot {
  const byId = new Map(quiz.questions.map((question) => [question.id, question]));
  const questions = questionIds
    .map((id) => byId.get(id))
    .filter((question): question is Question => !!question);
  const used = new Set(questions.map((question) => question.scenarioId).filter(Boolean));
  const scenarios = (quiz.scenarios ?? []).filter((scenario) => used.has(scenario.id));
  return {
    textFormat: quiz.textFormat,
    ...(scenarios.length > 0 ? { scenarios } : {}),
    questions,
  };
}

/**
 * Before a quiz is saved over, keeps a copy of what each of its attempts asked
 * whenever the edit changes it. An attempt that already has a copy keeps it.
 */
export function withQuizSnapshots(
  attempts: readonly QuizAttempt[],
  previous: Quiz,
  next: Quiz,
): { attempts: QuizAttempt[]; changed: boolean } {
  let changed = false;
  const out = attempts.map((attempt) => {
    if (attempt.quizId !== previous.id || attempt.snapshot) return attempt;
    const before = askedContent(previous, attempt.questionIds);
    if (JSON.stringify(before) === JSON.stringify(askedContent(next, attempt.questionIds))) {
      return attempt;
    }
    changed = true;
    return { ...attempt, snapshot: before };
  });
  return { attempts: out, changed };
}

/** The quiz as the attempt saw it: its snapshot, when an edit has changed the quiz since. */
export function quizForAttempt(quiz: Quiz, attempt: Pick<QuizAttempt, "snapshot">): Quiz {
  const snapshot = attempt.snapshot;
  if (!snapshot) return quiz;
  return {
    ...quiz,
    textFormat: snapshot.textFormat,
    scenarios: snapshot.scenarios,
    questions: snapshot.questions,
  };
}

/** The attempt's questions in the order they were asked, as they were asked. */
export function attemptQuestions(quiz: Quiz, attempt: Pick<QuizAttempt, "snapshot" | "questionIds">): Question[] {
  return askedContent(quizForAttempt(quiz, attempt), attempt.questionIds).questions;
}
