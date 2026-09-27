import { useSyncExternalStore } from "react";

const STORAGE_KEY = "quizapp:liveGrade";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let current = typeof window === "undefined" ? false : read();

export function liveGradeOn(): boolean {
  return current;
}

export function setLiveGrade(on: boolean): void {
  current = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(on));
  } catch {
    // ignore quota / privacy errors
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether "after each question" quizzes show the score so far beside the
 * progress bar. Settings changes it while a quiz may be open, so every reader
 * shares one value.
 */
export function useLiveGrade(): boolean {
  return useSyncExternalStore(subscribe, () => current, () => false);
}
