import type { QuizApi } from "../shared/quizApi";

declare global {
  interface Window {
    quizApi?: QuizApi;
  }
}

export {};
