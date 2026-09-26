import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore, type SessionConfig } from "@/state/sessionStore";
import { makeQuiz } from "./fixtures/quiz";

const config: SessionConfig = {
  shuffleQuestions: false,
  shuffleChoices: false,
  revealMode: "at_end",
  questionCount: 0,
  timeLimitMinutes: null,
  selfMark: false,
};

beforeEach(() => {
  useSessionStore.getState().reset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-23T12:00:00.000Z"));
});

afterEach(() => {
  useSessionStore.getState().reset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("quiz session", () => {
  it("starts with all questions in source order and creates a deadline", () => {
    const quiz = makeQuiz();
    useSessionStore.getState().start(quiz, { ...config, timeLimitMinutes: 5 });
    const state = useSessionStore.getState();
    expect(state.order).toEqual(["tf", "single", "multi"]);
    expect(state.currentQuestion()?.id).toBe("tf");
    expect(state.startedAt).toBe("2026-09-23T12:00:00.000Z");
    expect(state.deadlineAt).toBe("2026-09-23T12:05:00.000Z");
    expect(state.choicesOrder).toEqual({});
  });

  it("selects the requested number of unique questions without changing the quiz", () => {
    const quiz = makeQuiz();
    vi.spyOn(Math, "random").mockReturnValue(0);
    useSessionStore.getState().start(quiz, {
      ...config,
      questionCount: 2,
      shuffleQuestions: true,
      shuffleChoices: true,
    });
    const state = useSessionStore.getState();
    expect(state.order).toHaveLength(2);
    expect(new Set(state.order).size).toBe(2);
    expect(state.order.every((id) => quiz.questions.some((q) => q.id === id))).toBe(true);
    expect([...state.choicesOrder.single].sort()).toEqual(["a", "b", "c"]);
    expect([...state.choicesOrder.multi].sort()).toEqual(["a", "b", "c"]);
    expect(quiz.questions.map((q) => q.id)).toEqual(["tf", "single", "multi"]);
  });

  it("keeps navigation in bounds and tracks answers and submission", () => {
    useSessionStore.getState().start(makeQuiz(), config);
    useSessionStore.getState().goTo(-100);
    expect(useSessionStore.getState().currentIndex).toBe(0);
    useSessionStore.getState().setAnswer("tf", false);
    useSessionStore.getState().submitCurrent();
    expect(useSessionStore.getState().answers.tf).toBe(false);
    expect(useSessionStore.getState().isCurrentSubmitted()).toBe(true);
    useSessionStore.getState().goTo(100);
    expect(useSessionStore.getState().currentIndex).toBe(2);
    expect(useSessionStore.getState().isLast()).toBe(true);
    useSessionStore.getState().next();
    expect(useSessionStore.getState().currentIndex).toBe(2);
  });

  it("records the finish time once and clears state on reset", () => {
    useSessionStore.getState().start(makeQuiz(), config);
    const first = useSessionStore.getState().markEnded();
    vi.advanceTimersByTime(1000);
    expect(useSessionStore.getState().markEnded()).toBe(first);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().quiz).toBeNull();
    expect(useSessionStore.getState().answers).toEqual({});
    expect(useSessionStore.getState().endedAt).toBeNull();
  });
});
