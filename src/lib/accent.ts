export const ACCENTS = [
  { id: "blue", label: "Blue" },
  { id: "orange", label: "Orange" },
  { id: "green", label: "Green" },
  { id: "pink", label: "Pink" },
  { id: "purple", label: "Purple" },
  { id: "teal", label: "Teal" },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];

const STORAGE_KEY = "quizapp:accent";

export function isAccent(value: string | null): value is Accent {
  return ACCENTS.some((accent) => accent.id === value);
}

export function readInitialAccent(): Accent {
  if (typeof window === "undefined") return "blue";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAccent(stored) ? stored : "blue";
  } catch {
    return "blue";
  }
}

export function applyAccent(accent: Accent): void {
  document.documentElement.dataset.accent = accent;
}

export function rememberAccent(accent: Accent): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // ignore quota / privacy errors
  }
}
