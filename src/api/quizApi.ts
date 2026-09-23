import type { MobilePatch, MobileSession, MobileSessionSeed } from "@shared/mobile";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizAttempt,
  QuizMetadata,
  SaveAttemptInput,
  UpdateCheck,
} from "@shared/types";
import type {
  CreateFolderPayload,
  UpdateFolderPayload,
} from "../../electron/preload";
import type { ImportResult } from "../../electron/ipc/quizLibrary";

export const quizApi = {
  importQuiz: (folderId: string | null = null): Promise<ImportResult> =>
    window.quizApi.importQuiz(folderId),
  listQuizzes: (): Promise<QuizMetadata[]> => window.quizApi.listQuizzes(),
  getQuiz: (id: string): Promise<Quiz | null> => window.quizApi.getQuiz(id),
  deleteQuiz: (id: string): Promise<void> => window.quizApi.deleteQuiz(id),
  moveQuiz: (id: string, folderId: string | null): Promise<void> =>
    window.quizApi.moveQuiz(id, folderId),
  librarySnapshot: (): Promise<LibrarySnapshot> =>
    window.quizApi.librarySnapshot(),
  createFolder: (payload: CreateFolderPayload): Promise<Folder> =>
    window.quizApi.createFolder(payload),
  updateFolder: (payload: UpdateFolderPayload): Promise<Folder> =>
    window.quizApi.updateFolder(payload),
  deleteFolder: (id: string, recursive = true): Promise<void> =>
    window.quizApi.deleteFolder(id, recursive),
  saveAttempt: (input: SaveAttemptInput): Promise<QuizAttempt> =>
    window.quizApi.saveAttempt(input),
  listAttempts: (quizId: string): Promise<QuizAttempt[]> =>
    window.quizApi.listAttempts(quizId),
  getAttempt: (id: string): Promise<QuizAttempt | null> =>
    window.quizApi.getAttempt(id),
  deleteAttempts: (ids: string[]): Promise<void> =>
    window.quizApi.deleteAttempts(ids),
  checkForUpdate: (): Promise<UpdateCheck> => window.quizApi.checkForUpdate(),
  downloadUpdate: (): Promise<void> => window.quizApi.downloadUpdate(),
  saveQuizPdf: (html: string, filename: string): Promise<boolean> =>
    window.quizApi.saveQuizPdf(html, filename),
  startMobile: (seed: MobileSessionSeed): Promise<string> =>
    window.quizApi.startMobile(seed),
  stopMobile: (): Promise<void> => window.quizApi.stopMobile(),
  patchMobile: (patch: MobilePatch): Promise<MobileSession | null> =>
    window.quizApi.patchMobile(patch),
  onMobileSnapshot: (listener: (session: MobileSession) => void) =>
    window.quizApi.onMobileSnapshot(listener),
  onMobileConnected: (listener: () => void) =>
    window.quizApi.onMobileConnected(listener),
};
