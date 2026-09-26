import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readQuizSetupPreferences,
  writeQuizSetupPreferences,
} from "@/lib/quizPreferences";
import {
  readQuizTimeSettings,
  writeQuizTimeSettings,
} from "@/lib/quizTimeSettings";

let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("setup preferences", () => {
  it("round trips shared setup choices through localStorage", () => {
    const chosen = {
      shuffleQuestions: true,
      shuffleChoices: false,
      revealMode: "after_each" as const,
      enableMobile: true,
      selfMark: true,
    };
    writeQuizSetupPreferences(chosen);
    expect(readQuizSetupPreferences()).toEqual(chosen);
    expect([...stored.keys()]).toEqual(["quizapp:setup"]);
  });

  it("uses defaults for corrupt and incomplete values", () => {
    stored.set("quizapp:setup", "not JSON");
    expect(readQuizSetupPreferences()).toEqual({
      shuffleQuestions: false,
      shuffleChoices: true,
      revealMode: "at_end",
      enableMobile: false,
      selfMark: false,
    });
    stored.set("quizapp:setup", JSON.stringify({
      shuffleQuestions: true,
      revealMode: "invalid",
    }));
    expect(readQuizSetupPreferences()).toMatchObject({
      shuffleQuestions: true,
      shuffleChoices: true,
      revealMode: "at_end",
    });
  });
});

describe("quiz time settings", () => {
  it("keeps settings separate for each quiz", () => {
    writeQuizTimeSettings("quiz-a", {
      timeLimitEnabled: true,
      timeLimitMinutes: 15,
    });
    expect(readQuizTimeSettings("quiz-a")).toEqual({
      timeLimitEnabled: true,
      timeLimitMinutes: 15,
    });
    expect(readQuizTimeSettings("quiz-b")).toEqual({
      timeLimitEnabled: false,
      timeLimitMinutes: 60,
    });
    expect([...stored.keys()]).toEqual(["quizapp:timeLimit"]);
  });

  it("clamps saved limits and recovers from corrupt storage", () => {
    writeQuizTimeSettings("low", {
      timeLimitEnabled: true,
      timeLimitMinutes: -5,
    });
    writeQuizTimeSettings("high", {
      timeLimitEnabled: true,
      timeLimitMinutes: 20000,
    });
    expect(readQuizTimeSettings("low").timeLimitMinutes).toBe(1);
    expect(readQuizTimeSettings("high").timeLimitMinutes).toBe(9999);
    stored.set("quizapp:timeLimit", "not JSON");
    expect(readQuizTimeSettings("low").timeLimitMinutes).toBe(60);
  });
});
