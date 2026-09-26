import { browserQuizApi } from "@/lib/browserQuizApi";
import type { QuizApi } from "@shared/quizApi";

function activeQuizApi(): QuizApi {
  if (typeof window !== "undefined" && window.quizApi) return window.quizApi;
  return browserQuizApi;
}

export const quizApi: QuizApi = {
  importQuiz: (folderId) => activeQuizApi().importQuiz(folderId),
  listQuizzes: () => activeQuizApi().listQuizzes(),
  getQuiz: (id) => activeQuizApi().getQuiz(id),
  exportQuiz: (id) => activeQuizApi().exportQuiz(id),
  getQuizAssetUrls: (quizId, paths) => activeQuizApi().getQuizAssetUrls(quizId, paths),
  deleteQuiz: (id) => activeQuizApi().deleteQuiz(id),
  moveQuiz: (id, folderId) => activeQuizApi().moveQuiz(id, folderId),
  librarySnapshot: () => activeQuizApi().librarySnapshot(),
  createFolder: (payload) => activeQuizApi().createFolder(payload),
  updateFolder: (payload) => activeQuizApi().updateFolder(payload),
  deleteFolder: (id, recursive) => activeQuizApi().deleteFolder(id, recursive),
  saveAttempt: (input) => activeQuizApi().saveAttempt(input),
  listAttempts: (quizId) => activeQuizApi().listAttempts(quizId),
  getAttempt: (id) => activeQuizApi().getAttempt(id),
  setAttemptFlags: (id, flagged) => activeQuizApi().setAttemptFlags(id, flagged),
  setAttemptSelfMarks: (id, selfMarks, score) =>
    activeQuizApi().setAttemptSelfMarks(id, selfMarks, score),
  getAttemptPhotoUrls: (attemptId, names) =>
    activeQuizApi().getAttemptPhotoUrls(attemptId, names),
  getMobilePhoto: (name) => activeQuizApi().getMobilePhoto(name),
  deleteAttempts: (ids) => activeQuizApi().deleteAttempts(ids),
  deleteAllAppData: () => activeQuizApi().deleteAllAppData(),
  checkForUpdate: () => activeQuizApi().checkForUpdate(),
  downloadUpdate: () => activeQuizApi().downloadUpdate(),
  onUpdateProgress: (listener) => activeQuizApi().onUpdateProgress(listener),
  saveQuizPdf: (html, filename) => activeQuizApi().saveQuizPdf(html, filename),
  startMobile: (seed) => activeQuizApi().startMobile(seed),
  stopMobile: () => activeQuizApi().stopMobile(),
  patchMobile: (patch) => activeQuizApi().patchMobile(patch),
  onMobileSnapshot: (listener) => activeQuizApi().onMobileSnapshot(listener),
  onMobileConnected: (listener) => activeQuizApi().onMobileConnected(listener),
  setNativeTheme: (theme) => activeQuizApi().setNativeTheme(theme),
};
