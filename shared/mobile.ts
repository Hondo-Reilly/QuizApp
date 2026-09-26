import { isAnswered } from "./answers";
import { isSelfMark, withSelfMark } from "./selfMarks";
import {
  isOpenQuestion,
  isPhotoAnswer,
  isPhotoName,
  isTextQuestion,
  MAX_IMAGES_LIMIT,
  MAX_TEXT_LENGTH,
  maxImagesOf,
  textLimits,
} from "./questionTypes";
import type { Question, Quiz, RevealMode, SelfMark, UserAnswer } from "./types";

export type MobileTheme = "light" | "dark";

export interface MobileSessionSeed {
  quiz: Quiz;
  revealMode: RevealMode;
  order: string[];
  choicesOrder: Record<string, string[]>;
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  submitted: Record<string, boolean>;
  flagged: Record<string, boolean>;
  selfMarks: Record<string, SelfMark>;
  /** Whether this attempt lets the user mark their own open answers. */
  selfMarking: boolean;
  theme: MobileTheme;
  deadlineAt: string | null;
}

export interface MobileSession extends MobileSessionSeed {
  rev: number;
  finished: boolean;
}

export type MobilePatch =
  | { type: "answer"; questionId: string; answer: UserAnswer }
  | { type: "index"; currentIndex: number }
  | { type: "submit"; questionId: string }
  | { type: "flag"; questionId: string; flagged: boolean }
  | { type: "mark"; questionId: string; mark: SelfMark | null }
  | { type: "theme"; theme: MobileTheme }
  | { type: "finish" };

export function sameAnswer(
  a: UserAnswer | undefined,
  b: UserAnswer | undefined,
): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => item === b[index]);
  }
  return a === b;
}

export function createMobileSession(seed: MobileSessionSeed): MobileSession {
  return {
    ...seed,
    currentIndex: clampIndex(seed.currentIndex, seed.order.length),
    rev: 1,
    finished: false,
  };
}

export function applyMobilePatch(
  session: MobileSession,
  patch: MobilePatch,
): MobileSession {
  if (mobilePatchIssue(session, patch)) return session;

  if (patch.type === "theme") {
    if (patch.theme !== "light" && patch.theme !== "dark") return session;
    if (session.theme === patch.theme) return session;
    return { ...session, theme: patch.theme, rev: session.rev + 1 };
  }

  if (session.finished) return session;

  if (patch.type === "answer") {
    if (!session.order.includes(patch.questionId)) return session;
    if (session.submitted[patch.questionId]) return session;
    if (sameAnswer(session.answers[patch.questionId], patch.answer)) {
      return session;
    }
    return {
      ...session,
      answers: { ...session.answers, [patch.questionId]: patch.answer },
      rev: session.rev + 1,
    };
  }

  if (patch.type === "index") {
    const currentIndex = clampIndex(patch.currentIndex, session.order.length);
    if (currentIndex === session.currentIndex) return session;
    return { ...session, currentIndex, rev: session.rev + 1 };
  }

  if (patch.type === "flag") {
    if (!session.order.includes(patch.questionId)) return session;
    if (!!session.flagged[patch.questionId] === patch.flagged) return session;
    const flagged = { ...session.flagged };
    if (patch.flagged) flagged[patch.questionId] = true;
    else delete flagged[patch.questionId];
    return { ...session, flagged, rev: session.rev + 1 };
  }

  if (patch.type === "mark") {
    if (!session.order.includes(patch.questionId)) return session;
    if ((session.selfMarks[patch.questionId] ?? null) === patch.mark) return session;
    return { ...session, ...withSelfMark(session, patch.questionId, patch.mark), rev: session.rev + 1 };
  }

  if (patch.type === "submit") {
    if (!session.order.includes(patch.questionId)) return session;
    if (session.submitted[patch.questionId]) return session;
    return {
      ...session,
      submitted: { ...session.submitted, [patch.questionId]: true },
      rev: session.rev + 1,
    };
  }

  return { ...session, finished: true, rev: session.rev + 1 };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.trunc(index), length - 1));
}

const PATCH_KEYS: Record<MobilePatch["type"], readonly string[]> = {
  finish: ["type"],
  theme: ["type", "theme"],
  index: ["type", "currentIndex"],
  submit: ["type", "questionId"],
  flag: ["type", "questionId", "flagged"],
  mark: ["type", "questionId", "mark"],
  answer: ["type", "questionId", "answer"],
};

function exactPatchKeys(value: object, type: string): boolean {
  const allowed = PATCH_KEYS[type as MobilePatch["type"]];
  if (!allowed) return false;
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

function isQuestionId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function isPatchAnswer(value: unknown): value is UserAnswer {
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= MAX_TEXT_LENGTH;
  if (Array.isArray(value)) {
    return (
      value.length <= 100 &&
      value.every((item) => typeof item === "string" && item.length <= 200)
    );
  }
  if (typeof value !== "object") return false;
  const keys = Object.keys(value);
  const photos = (value as { photos?: unknown }).photos;
  return (
    keys.length === 1 &&
    Array.isArray(photos) &&
    photos.length <= MAX_IMAGES_LIMIT &&
    photos.every((name) => typeof name === "string" && isPhotoName(name))
  );
}

export function isMobilePatch(value: unknown): value is MobilePatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Partial<MobilePatch>;
  if (typeof patch.type !== "string" || !exactPatchKeys(value, patch.type)) return false;
  if (patch.type === "finish") return true;
  if (patch.type === "theme") return patch.theme === "light" || patch.theme === "dark";
  if (patch.type === "index") return Number.isFinite(patch.currentIndex);
  if (patch.type === "submit") return isQuestionId(patch.questionId);
  if (patch.type === "flag") {
    return isQuestionId(patch.questionId) && typeof patch.flagged === "boolean";
  }
  if (patch.type === "mark") {
    return isQuestionId(patch.questionId) && (patch.mark === null || isSelfMark(patch.mark));
  }
  if (patch.type === "answer") {
    return isQuestionId(patch.questionId) && isPatchAnswer(patch.answer);
  }
  return false;
}

export function mobilePatchIssue(
  session: MobileSession,
  patch: MobilePatch,
): string | null {
  if (patch.type === "theme" || patch.type === "finish" || patch.type === "index") {
    return null;
  }
  if (!session.order.includes(patch.questionId)) {
    return "That question is not in this quiz.";
  }
  // Flags stay editable after an answer is revealed.
  if (patch.type === "flag") return null;
  if (patch.type === "mark") {
    const question = session.quiz.questions.find((item) => item.id === patch.questionId);
    if (!session.selfMarking) return "Self-marking is off for this quiz.";
    if (!question || !isOpenQuestion(question)) return "Only written and photo answers can be self-marked.";
    return null;
  }
  if (session.finished || session.submitted[patch.questionId]) return null;
  const question = session.quiz.questions.find((item) => item.id === patch.questionId);
  if (!question) return "That question is not in this quiz.";
  if (patch.type === "submit") {
    return isAnswered(question, session.answers[patch.questionId] ?? null)
      ? null
      : "Choose an answer before submitting.";
  }
  return answerFitsQuestion(question, patch.answer)
    ? null
    : "That answer does not match this question.";
}

function answerFitsQuestion(question: Question, answer: UserAnswer): boolean {
  if (answer === null) return true;
  if (question.type === "true_false") return typeof answer === "boolean";
  if (isTextQuestion(question)) {
    return typeof answer === "string" && answer.length <= textLimits(question).maxLength;
  }
  if (question.type === "image_response") {
    return (
      isPhotoAnswer(answer) &&
      answer.photos.length <= maxImagesOf(question) &&
      new Set(answer.photos).size === answer.photos.length
    );
  }
  if (question.type === "multiple_choice") {
    return (
      typeof answer === "string" &&
      question.choices.some((choice) => choice.id === answer)
    );
  }
  if (!Array.isArray(answer)) return false;
  const allowed = new Set(question.choices.map((choice) => choice.id));
  const seen = new Set<string>();
  return answer.every((id) => {
    if (!allowed.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
