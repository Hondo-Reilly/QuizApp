import { importBatchMessage, type ImportFailure } from "@shared/importBatch";
import type { QuizApi } from "@shared/quizApi";
import type { UpdateCheck, UpdateProgress } from "@shared/types";
import {
  deleteBrowserAttempts,
  getBrowserAttempt,
  listBrowserAttempts,
  saveBrowserAttempt,
} from "./browserAttempts";
import {
  createBrowserFolder,
  deleteBrowserFolder,
  deleteBrowserQuiz,
  getBrowserQuiz,
  importQuizText,
  librarySnapshot,
  moveBrowserQuiz,
  updateBrowserFolder,
} from "./browserLibrary";
import { clearAppLocalStorage } from "./appStorage";
import { pickQuizFiles, printHtml } from "./browserLocal";
import { deleteDatabase, run } from "./idbRecords";

const noUpdate: UpdateCheck = {
  updateAvailable: false,
  currentVersion: "web",
  latestVersion: null,
  downloadUrl: null,
  releaseNotes: null,
};

export const browserQuizApi: QuizApi = {
  importQuiz: (folderId = null) =>
    run(async () => {
      const files = await pickQuizFiles();
      if (!files || files.length === 0) return { ok: false, cancelled: true };
      const imported = [];
      const failures: ImportFailure[] = [];
      for (const file of files) {
        try {
          imported.push(await importQuizText(await file.text(), folderId, file.name));
        } catch (err) {
          failures.push({
            name: file.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      const error = importBatchMessage(imported.length, failures);
      if (error) return { ok: false, error, imported, failures };
      return { ok: true, imported };
    }),
  listQuizzes: () =>
    run(async () => {
      const snap = await librarySnapshot();
      return snap.quizzes;
    }),
  getQuiz: (id) => run(() => getBrowserQuiz(id)),
  deleteQuiz: (id) => run(() => deleteBrowserQuiz(id)),
  moveQuiz: (id, folderId) => run(() => moveBrowserQuiz(id, folderId)),
  librarySnapshot: () => run(librarySnapshot),
  createFolder: (payload) => run(() => createBrowserFolder(payload)),
  updateFolder: (payload) => run(() => updateBrowserFolder(payload)),
  deleteFolder: (id, recursive = true) => run(() => deleteBrowserFolder(id, recursive)),
  saveAttempt: (input) => run(() => saveBrowserAttempt(input)),
  listAttempts: (quizId) => run(() => listBrowserAttempts(quizId)),
  getAttempt: (id) => run(() => getBrowserAttempt(id)),
  deleteAttempts: (ids) => run(() => deleteBrowserAttempts(ids)),
  deleteAllAppData: () =>
    run(async () => {
      await deleteDatabase();
      clearAppLocalStorage(window.localStorage);
    }),
  checkForUpdate: () => Promise.resolve(noUpdate),
  downloadUpdate: () => Promise.resolve(),
  onUpdateProgress: (_listener: (progress: UpdateProgress) => void) => () => undefined,
  saveQuizPdf: (html) => printHtml(html),
  startMobile: () =>
    Promise.reject(new Error("Mobile mode is only available in the desktop app.")),
  stopMobile: () => Promise.resolve(),
  patchMobile: () => Promise.resolve(null),
  onMobileSnapshot: () => () => undefined,
  onMobileConnected: () => () => undefined,
  setNativeTheme: () => undefined,
};
