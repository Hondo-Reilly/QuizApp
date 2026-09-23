import type { RevealMode } from "@shared/types";

const STORAGE_KEY = "quizapp:setup";

export interface QuizSetupPreferences {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  revealMode: RevealMode;
  enableMobile: boolean;
}

const DEFAULTS: QuizSetupPreferences = {
  shuffleQuestions: false,
  shuffleChoices: true,
  revealMode: "at_end",
  enableMobile: false,
};

function isRevealMode(value: unknown): value is RevealMode {
  return value === "after_each" || value === "at_end";
}

export function readQuizSetupPreferences(): QuizSetupPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<QuizSetupPreferences>;
    return {
      shuffleQuestions:
        typeof parsed.shuffleQuestions === "boolean"
          ? parsed.shuffleQuestions
          : DEFAULTS.shuffleQuestions,
      shuffleChoices:
        typeof parsed.shuffleChoices === "boolean"
          ? parsed.shuffleChoices
          : DEFAULTS.shuffleChoices,
      revealMode: isRevealMode(parsed.revealMode)
        ? parsed.revealMode
        : DEFAULTS.revealMode,
      enableMobile:
        typeof parsed.enableMobile === "boolean"
          ? parsed.enableMobile
          : DEFAULTS.enableMobile,
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeQuizSetupPreferences(prefs: QuizSetupPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / privacy errors
  }
}
