import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IpcChannels } from "../shared/ipcChannels";
import type { MobilePatch, MobileSession, MobileSessionSeed } from "../shared/mobile";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizAttempt,
  QuizMetadata,
  SaveAttemptInput,
  UpdateCheck,
} from "../shared/types";
import type { ImportResult } from "./ipc/quizLibrary";

export interface CreateFolderPayload {
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdateFolderPayload {
  id: string;
  name?: string;
  description?: string;
}

const quizApi = {
  importQuiz: (folderId: string | null = null): Promise<ImportResult> =>
    ipcRenderer.invoke(IpcChannels.importQuiz, folderId),
  listQuizzes: (): Promise<QuizMetadata[]> =>
    ipcRenderer.invoke(IpcChannels.listQuizzes),
  getQuiz: (id: string): Promise<Quiz | null> =>
    ipcRenderer.invoke(IpcChannels.getQuiz, id),
  deleteQuiz: (id: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.deleteQuiz, id),
  moveQuiz: (id: string, folderId: string | null): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.moveQuiz, { id, folderId }),
  librarySnapshot: (): Promise<LibrarySnapshot> =>
    ipcRenderer.invoke(IpcChannels.librarySnapshot),
  createFolder: (payload: CreateFolderPayload): Promise<Folder> =>
    ipcRenderer.invoke(IpcChannels.createFolder, payload),
  updateFolder: (payload: UpdateFolderPayload): Promise<Folder> =>
    ipcRenderer.invoke(IpcChannels.updateFolder, payload),
  deleteFolder: (id: string, recursive = true): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.deleteFolder, { id, recursive }),
  saveAttempt: (input: SaveAttemptInput): Promise<QuizAttempt> =>
    ipcRenderer.invoke(IpcChannels.saveAttempt, input),
  listAttempts: (quizId: string): Promise<QuizAttempt[]> =>
    ipcRenderer.invoke(IpcChannels.listAttempts, quizId),
  getAttempt: (id: string): Promise<QuizAttempt | null> =>
    ipcRenderer.invoke(IpcChannels.getAttempt, id),
  deleteAttempts: (ids: string[]): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.deleteAttempts, ids),
  checkForUpdate: (): Promise<UpdateCheck> =>
    ipcRenderer.invoke(IpcChannels.checkForUpdate),
  downloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.downloadUpdate),
  saveQuizPdf: (html: string, filename: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.saveQuizPdf, { html, filename }),
  startMobile: (seed: MobileSessionSeed): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.mobileStart, seed),
  stopMobile: (): Promise<void> => ipcRenderer.invoke(IpcChannels.mobileStop),
  patchMobile: (patch: MobilePatch): Promise<MobileSession | null> =>
    ipcRenderer.invoke(IpcChannels.mobilePatch, patch),
  onMobileSnapshot: (listener: (session: MobileSession) => void) => {
    const wrapped = (_event: IpcRendererEvent, next: MobileSession) =>
      listener(next);
    ipcRenderer.on(IpcChannels.mobileSnapshot, wrapped);
    return () => {
      ipcRenderer.removeListener(IpcChannels.mobileSnapshot, wrapped);
    };
  },
  onMobileConnected: (listener: () => void) => {
    const wrapped = () => listener();
    ipcRenderer.on(IpcChannels.mobileConnected, wrapped);
    return () => {
      ipcRenderer.removeListener(IpcChannels.mobileConnected, wrapped);
    };
  },
};

export type QuizApi = typeof quizApi;

contextBridge.exposeInMainWorld("quizApi", quizApi);
