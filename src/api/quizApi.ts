import type { QuizApi } from "../../electron/preload";
import { browserQuizApi } from "@/lib/browserStore";

function desktop(): QuizApi | null {
  if (typeof window === "undefined") return null;
  return window.quizApi ?? null;
}

export const quizApi: QuizApi = new Proxy(browserQuizApi, {
  get(target, prop, receiver) {
    const source = desktop() ?? target;
    const value = Reflect.get(source, prop, receiver);
    return typeof value === "function" ? value.bind(source) : value;
  },
});
