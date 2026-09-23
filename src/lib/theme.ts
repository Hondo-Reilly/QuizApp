export type Theme = "light" | "dark";

const STORAGE_KEY = "quizapp:theme";

export function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.quizApi?.setNativeTheme(theme);
}

export function rememberTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore quota / privacy errors
  }
}

export function withTheme(url: string, theme: Theme): string {
  const next = new URL(url);
  next.searchParams.set("theme", theme);
  return next.toString();
}
