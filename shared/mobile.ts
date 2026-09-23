import type { Quiz, RevealMode, UserAnswer } from "./types";

export type MobileTheme = "light" | "dark";

export interface MobileSessionSeed {
  quiz: Quiz;
  revealMode: RevealMode;
  order: string[];
  choicesOrder: Record<string, string[]>;
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  submitted: Record<string, boolean>;
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

export function isMobilePatch(value: unknown): value is MobilePatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as Partial<MobilePatch>;
  if (patch.type === "finish") return true;
  if (patch.type === "theme") {
    const theme = (patch as { theme?: unknown }).theme;
    return theme === "light" || theme === "dark";
  }
  if (patch.type === "index") {
    return typeof (patch as { currentIndex?: unknown }).currentIndex === "number";
  }
  if (patch.type === "submit" || patch.type === "answer") {
    return typeof (patch as { questionId?: unknown }).questionId === "string";
  }
  return false;
}
