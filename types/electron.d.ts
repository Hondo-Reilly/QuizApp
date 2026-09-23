import type { QuizApi } from "../electron/preload";

declare global {
  interface Window {
    quizApi?: QuizApi;
  }
}

export {};
