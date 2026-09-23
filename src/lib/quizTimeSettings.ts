const STORAGE_KEY = "quizapp:timeLimit";

export const DEFAULT_TIME_LIMIT_MINUTES = 60;

export interface QuizTimeSettings {
  timeLimitEnabled: boolean;
  timeLimitMinutes: number;
}

const DEFAULTS: QuizTimeSettings = {
  timeLimitEnabled: false,
  timeLimitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
};

function clampMinutes(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULTS.timeLimitMinutes;
  }
  return Math.max(1, Math.min(9999, Math.round(value)));
}

export function readQuizTimeSettings(quizId: string): QuizTimeSettings {
  if (!quizId || typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Record<string, Partial<QuizTimeSettings>>;
    const saved = parsed[quizId];
    if (!saved || typeof saved !== "object") return DEFAULTS;
    return {
      timeLimitEnabled: saved.timeLimitEnabled === true,
      timeLimitMinutes: clampMinutes(saved.timeLimitMinutes),
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeQuizTimeSettings(
  quizId: string,
  settings: QuizTimeSettings,
): void {
  if (!quizId || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, QuizTimeSettings>)
      : {};
    parsed[quizId] = {
      timeLimitEnabled: settings.timeLimitEnabled,
      timeLimitMinutes: clampMinutes(settings.timeLimitMinutes),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / privacy errors
  }
}
