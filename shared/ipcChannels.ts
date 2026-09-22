export const IpcChannels = {
  importQuiz: "quiz:import",
  listQuizzes: "quiz:list",
  getQuiz: "quiz:get",
  deleteQuiz: "quiz:delete",
  moveQuiz: "quiz:move",
  librarySnapshot: "library:snapshot",
  createFolder: "folder:create",
  updateFolder: "folder:update",
  deleteFolder: "folder:delete",
  saveAttempt: "attempt:save",
  listAttempts: "attempt:list",
  getAttempt: "attempt:get",
  deleteAttempts: "attempt:delete",
  checkForUpdate: "updates:check",
  downloadUpdate: "updates:download",
  saveQuizPdf: "quiz:save-pdf",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];
