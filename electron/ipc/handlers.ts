import { registerAppDataHandlers } from "./appData";
import { registerAttemptHandlers } from "./attempts";
import { registerMobileHandlers } from "./mobile";
import { registerPdfHandlers } from "./quizPdf";
import { registerQuizLibraryHandlers } from "./quizLibrary";
import { registerThemeHandlers } from "./theme";
import { registerUpdateHandlers } from "./updates";

export function registerIpcHandlers(): void {
  registerQuizLibraryHandlers();
  registerAppDataHandlers();
  registerAttemptHandlers();
  registerUpdateHandlers();
  registerPdfHandlers();
  registerMobileHandlers();
  registerThemeHandlers();
}
