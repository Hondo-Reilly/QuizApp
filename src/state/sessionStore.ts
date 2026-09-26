import { create } from "zustand";
import type {
  Quiz,
  Question,
  RevealMode,
  UserAnswer,
} from "@shared/types";
import { shuffle } from "@shared/shuffle";
import { scenarioBlocks } from "@shared/scenarios";

export interface SessionConfig {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  revealMode: RevealMode;
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface SessionState {
  quiz: Quiz | null;
  config: SessionConfig;
  order: string[];
  choicesOrder: Record<string, string[]>;
  startedAt: string | null;
  endedAt: string | null;
  deadlineAt: string | null;
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  submitted: Record<string, boolean>;

  start: (quiz: Quiz, config: SessionConfig) => void;
  markEnded: () => string;
  applyRemote: (patch: {
    currentIndex: number;
    answers: Record<string, UserAnswer>;
    submitted: Record<string, boolean>;
  }) => void;
  setAnswer: (questionId: string, answer: UserAnswer) => void;
  submitCurrent: () => void;
  next: () => void;
  goTo: (index: number) => void;
  reset: () => void;

  currentQuestion: () => Question | null;
  isLast: () => boolean;
  isCurrentSubmitted: () => boolean;
}

const initialState = {
  quiz: null as Quiz | null,
  config: {
    shuffleQuestions: false,
    shuffleChoices: true,
    revealMode: "at_end" as RevealMode,
    questionCount: 0,
    timeLimitMinutes: null,
  },
  order: [] as string[],
  choicesOrder: {} as Record<string, string[]>,
  startedAt: null as string | null,
  endedAt: null as string | null,
  deadlineAt: null as string | null,
  currentIndex: 0,
  answers: {} as Record<string, UserAnswer>,
  submitted: {} as Record<string, boolean>,
};

// Questions that share a scenario stay together, in authored order.
function shuffledIds(quiz: Quiz): string[] {
  return shuffle(scenarioBlocks(quiz.questions)).flatMap((block) =>
    block.map((q) => q.id),
  );
}

function buildOrder(quiz: Quiz, config: SessionConfig): string[] {
  const allIds = quiz.questions.map((q) => q.id);
  const requested = Math.max(
    1,
    Math.min(config.questionCount || allIds.length, allIds.length),
  );

  if (requested >= allIds.length) {
    return config.shuffleQuestions ? shuffledIds(quiz) : allIds;
  }

  return shuffledIds(quiz).slice(0, requested);
}

function buildChoicesOrder(
  quiz: Quiz,
  shuffleChoices: boolean,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!shuffleChoices) return out;
  for (const q of quiz.questions) {
    if (q.type === "multiple_choice" || q.type === "multi_answer") {
      out[q.id] = shuffle(q.choices.map((c) => c.id));
    }
  }
  return out;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  start: (quiz, config) => {
    const startedAt = new Date().toISOString();
    const minutes = config.timeLimitMinutes;
    const deadlineAt =
      minutes != null && minutes > 0
        ? new Date(Date.parse(startedAt) + minutes * 60_000).toISOString()
        : null;
    set({
      quiz,
      config,
      order: buildOrder(quiz, config),
      choicesOrder: buildChoicesOrder(quiz, config.shuffleChoices),
      startedAt,
      endedAt: null,
      deadlineAt,
      currentIndex: 0,
      answers: {},
      submitted: {},
    });
  },

  markEnded: () => {
    const existing = get().endedAt;
    if (existing) return existing;
    const endedAt = new Date().toISOString();
    set({ endedAt });
    return endedAt;
  },

  applyRemote: ({ currentIndex, answers, submitted }) =>
    set({ currentIndex, answers, submitted }),

  setAnswer: (questionId, answer) =>
    set((s) => ({ answers: { ...s.answers, [questionId]: answer } })),

  submitCurrent: () => {
    const { order, currentIndex } = get();
    const id = order[currentIndex];
    if (!id) return;
    set((s) => ({ submitted: { ...s.submitted, [id]: true } }));
  },

  next: () =>
    set((s) => ({
      currentIndex: Math.min(s.currentIndex + 1, s.order.length - 1),
    })),

  goTo: (index) =>
    set((s) => ({
      currentIndex: Math.max(0, Math.min(index, s.order.length - 1)),
    })),

  reset: () => set(initialState),

  currentQuestion: () => {
    const { quiz, order, currentIndex } = get();
    if (!quiz) return null;
    const id = order[currentIndex];
    return quiz.questions.find((q) => q.id === id) ?? null;
  },

  isLast: () => {
    const { order, currentIndex } = get();
    return currentIndex >= order.length - 1;
  },

  isCurrentSubmitted: () => {
    const { order, currentIndex, submitted } = get();
    const id = order[currentIndex];
    return !!(id && submitted[id]);
  },
}));
