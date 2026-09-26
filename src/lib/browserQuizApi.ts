import { importBatchMessage, type ImportFailure } from "@shared/importBatch";
import type { QuizApi } from "@shared/quizApi";
import type { UpdateCheck, UpdateProgress } from "@shared/types";
import {
  deleteBrowserAttempts,
  getBrowserAttempt,
  listBrowserAttempts,
  saveBrowserAttempt,
  setBrowserAttemptFlags,
  setBrowserAttemptSelfMarks,
} from "./browserAttempts";
import {
  createBrowserFolder,
  deleteBrowserFolder,
  deleteBrowserQuiz,
  getBrowserQuiz,
  exportBrowserQuiz,
  importQuizBytes,
  librarySnapshot,
  moveBrowserQuiz,
  updateBrowserFolder,
} from "./browserLibrary";
import { clearAppLocalStorage } from "./appStorage";
import {
  browserAssetUrls,
  browserAttemptPhotoUrls,
  forgetBrowserAssetUrls,
  forgetBrowserAttemptPhotoUrls,
} from "./browserAssetUrls";
import { downloadBytes, pickQuizFiles, printHtml } from "./browserLocal";
import { slugifyTitle } from "@shared/storageId";
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
          imported.push(
            await importQuizBytes(
              new Uint8Array(await file.arrayBuffer()),
              folderId,
              file.name,
            ),
          );
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
  exportQuiz: (id) =>
    run(async () => {
      const exported = await exportBrowserQuiz(id);
      if (!exported) throw new Error("Quiz not found");
      downloadBytes(exported.bytes, `${slugifyTitle(exported.title)}.quiz`);
      return true;
    }),
  getQuizAssetUrls: (quizId, paths) => run(() => browserAssetUrls(quizId, paths)),
  deleteQuiz: (id) =>
    run(async () => {
      await deleteBrowserQuiz(id);
      forgetBrowserAssetUrls(id);
    }),
  moveQuiz: (id, folderId) => run(() => moveBrowserQuiz(id, folderId)),
  librarySnapshot: () => run(librarySnapshot),
  createFolder: (payload) => run(() => createBrowserFolder(payload)),
  updateFolder: (payload) => run(() => updateBrowserFolder(payload)),
  deleteFolder: (id, recursive = true) =>
    run(async () => {
      await deleteBrowserFolder(id, recursive);
      forgetBrowserAssetUrls();
    }),
  saveAttempt: (input) => run(() => saveBrowserAttempt(input)),
  listAttempts: (quizId) => run(() => listBrowserAttempts(quizId)),
  getAttempt: (id) => run(() => getBrowserAttempt(id)),
  setAttemptFlags: (id, flagged) => run(() => setBrowserAttemptFlags(id, flagged)),
  setAttemptSelfMarks: (id, selfMarks, score) =>
    run(() => setBrowserAttemptSelfMarks(id, selfMarks, score)),
  getAttemptPhotoUrls: (attemptId, names) =>
    run(() => browserAttemptPhotoUrls(attemptId, names)),
  getMobilePhoto: () => Promise.resolve(null),
  deleteAttempts: (ids) =>
    run(async () => {
      await deleteBrowserAttempts(ids);
      forgetBrowserAttemptPhotoUrls(ids);
    }),
  deleteAllAppData: () =>
    run(async () => {
      await deleteDatabase();
      forgetBrowserAssetUrls();
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
