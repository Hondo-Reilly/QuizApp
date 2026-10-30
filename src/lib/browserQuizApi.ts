import { createCloudShare, type CloudShareStore } from "@shared/cloudShare";
import { importBatchMessage, type ImportFailure } from "@shared/importBatch";
import type { ImportResult, QuizApi, QuizFileInput } from "@shared/quizApi";
import type {
  QuizCloudSource,
  QuizMetadata,
  UpdateCheck,
  UpdateProgress,
} from "@shared/types";
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
  getBrowserQuizMetadata,
  importQuizBytes,
  librarySnapshot,
  moveBrowserQuiz,
  replaceBrowserQuizBytes,
  updateBrowserCloudFields,
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

async function replaceBrowserQuiz(
  id: string,
  bytes: Uint8Array,
  sourceName: string,
  cloudSource?: QuizCloudSource,
): Promise<QuizMetadata> {
  const meta = await replaceBrowserQuizBytes(id, bytes, sourceName, cloudSource);
  forgetBrowserAssetUrls(id);
  return meta;
}

// Each store call joins the IndexedDB queue on its own, so a slow upload or
// download does not hold up other library reads and writes.
const cloudStore: CloudShareStore = {
  getMeta: (id) => run(() => getBrowserQuizMetadata(id)),
  listMeta: () => run(async () => (await librarySnapshot()).quizzes),
  exportPackage: (id) => run(() => exportBrowserQuiz(id)),
  updateCloudFields: (ids, update) => run(() => updateBrowserCloudFields(ids, update)),
  importBytes: (bytes, folderId, sourceName, cloudSource) =>
    run(() => importQuizBytes(bytes, folderId, sourceName, cloudSource)),
  replaceBytes: (id, bytes, sourceName, cloudSource) =>
    run(() => replaceBrowserQuiz(id, bytes, sourceName, cloudSource)),
};

// Needs the page's origin in the quiz-app namespace's corsOrigins on hjr-data.
const cloud = createCloudShare(cloudStore, (url, init) => window.fetch(url, init));

async function importFiles(
  files: readonly QuizFileInput[],
  folderId: string | null,
): Promise<ImportResult> {
  const imported = [];
  const failures: ImportFailure[] = [];
  for (const file of files) {
    try {
      imported.push(await importQuizBytes(file.bytes, folderId, file.name));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // The batch message names the file already.
      failures.push({
        name: file.name,
        error: message.replace(`Failed to import ${file.name}: `, ""),
      });
    }
  }
  const error = importBatchMessage(imported.length, failures);
  if (error) return { ok: false, error, imported, failures };
  return { ok: true, imported };
}

export const browserQuizApi: QuizApi = {
  importQuiz: (folderId = null) =>
    run(async () => {
      const files = await pickQuizFiles();
      if (!files || files.length === 0) return { ok: false, cancelled: true };
      const inputs = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      return importFiles(inputs, folderId);
    }),
  importQuizFiles: (files, folderId) => run(() => importFiles(files, folderId)),
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
  revealQuiz: () =>
    Promise.reject(new Error("Show in Finder is only available in the desktop app.")),
  getQuizAssetUrls: (quizId, paths) => run(() => browserAssetUrls(quizId, paths)),
  deleteQuiz: (id) =>
    run(async () => {
      await deleteBrowserQuiz(id);
      forgetBrowserAssetUrls(id);
    }),
  moveQuiz: (id, folderId) => run(() => moveBrowserQuiz(id, folderId)),
  replaceQuizFromFile: async (id) => {
    const [file] = (await pickQuizFiles(false)) ?? [];
    if (!file) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    return run(() => replaceBrowserQuiz(id, bytes, file.name));
  },
  shareQuiz: (id) => cloud.shareQuiz(id),
  publishQuizUpdate: (id) => cloud.publishQuizUpdate(id),
  extendQuizShare: (id) => cloud.extendQuizShare(id),
  unshareQuiz: (id) => cloud.unshareQuiz(id),
  previewSharedQuiz: (code) => cloud.previewSharedQuiz(code),
  importSharedQuiz: (code, folderId) => cloud.importSharedQuiz(code, folderId),
  checkSharedQuizzes: () => cloud.checkSharedQuizzes(),
  updateSharedQuiz: (id) => cloud.updateSharedQuiz(id),
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
