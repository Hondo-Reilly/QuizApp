import { create } from "zustand";
import type {
  Quiz,
  Question,
  RevealMode,
  UserAnswer,
} from "@shared/types";
import { shuffle } from "@shared/shuffle";

export interface SessionConfig {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  revealMode: RevealMode;
  questionCount: number;
}

interface SessionState {
  quiz: Quiz | null;
  config: SessionConfig;
  order: string[];
  choicesOrder: Record<string, string[]>;
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  submitted: Record<string, boolean>;

  start: (quiz: Quiz, config: SessionConfig) => void;
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
  },
  order: [] as string[],
  choicesOrder: {} as Record<string, string[]>,
  currentIndex: 0,
  answers: {} as Record<string, UserAnswer>,
  submitted: {} as Record<string, boolean>,
};

function buildOrder(quiz: Quiz, config: SessionConfig): string[] {
  const allIds = quiz.questions.map((q) => q.id);
  const requested = Math.max(
    1,
    Math.min(config.questionCount || allIds.length, allIds.length),
  );

  if (requested >= allIds.length) {
    return config.shuffleQuestions ? shuffle(allIds) : allIds;
  }

  const picked = shuffle(allIds).slice(0, requested);
  if (config.shuffleQuestions) return picked;

  const originalIndex = new Map(allIds.map((id, i) => [id, i]));
  return picked
    .slice()
    .sort((a, b) => originalIndex.get(a)! - originalIndex.get(b)!);
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
    set({
      quiz,
      config,
      order: buildOrder(quiz, config),
      choicesOrder: buildChoicesOrder(quiz, config.shuffleChoices),
      currentIndex: 0,
      answers: {},
      submitted: {},
    });
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
