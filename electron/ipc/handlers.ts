import { registerAttemptHandlers } from "./attempts";
import { registerQuizLibraryHandlers } from "./quizLibrary";

export function registerIpcHandlers(): void {
  registerQuizLibraryHandlers();
  registerAttemptHandlers();
}
