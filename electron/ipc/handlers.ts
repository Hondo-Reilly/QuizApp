import { registerAttemptHandlers } from "./attempts";
import { registerMobileHandlers } from "./mobile";
import { registerPdfHandlers } from "./quizPdf";
import { registerQuizLibraryHandlers } from "./quizLibrary";
import { registerUpdateHandlers } from "./updates";

export function registerIpcHandlers(): void {
  registerQuizLibraryHandlers();
  registerAttemptHandlers();
  registerUpdateHandlers();
  registerPdfHandlers();
  registerMobileHandlers();
}
