import { registerAttemptHandlers } from "./attempts";
import { registerPdfHandlers } from "./quizPdf";
import { registerQuizLibraryHandlers } from "./quizLibrary";
import { registerUpdateHandlers } from "./updates";

export function registerIpcHandlers(): void {
  registerQuizLibraryHandlers();
  registerAttemptHandlers();
  registerUpdateHandlers();
  registerPdfHandlers();
}
