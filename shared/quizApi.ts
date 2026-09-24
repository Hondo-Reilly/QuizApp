import type { ImportFailure } from "./importBatch";
import type { MobilePatch, MobileSession, MobileSessionSeed } from "./mobile";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizAttempt,
  QuizMetadata,
  SaveAttemptInput,
  UpdateCheck,
  UpdateProgress,
} from "./types";

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

export interface ImportResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
  imported?: QuizMetadata[];
  failures?: ImportFailure[];
}

export interface QuizApi {
  importQuiz(folderId?: string | null): Promise<ImportResult>;
  listQuizzes(): Promise<QuizMetadata[]>;
  getQuiz(id: string): Promise<Quiz | null>;
  deleteQuiz(id: string): Promise<void>;
  moveQuiz(id: string, folderId: string | null): Promise<void>;
  librarySnapshot(): Promise<LibrarySnapshot>;
  createFolder(payload: CreateFolderPayload): Promise<Folder>;
  updateFolder(payload: UpdateFolderPayload): Promise<Folder>;
  deleteFolder(id: string, recursive?: boolean): Promise<void>;
  saveAttempt(input: SaveAttemptInput): Promise<QuizAttempt>;
  listAttempts(quizId: string): Promise<QuizAttempt[]>;
  getAttempt(id: string): Promise<QuizAttempt | null>;
  deleteAttempts(ids: string[]): Promise<void>;
  deleteAllAppData(): Promise<void>;
  checkForUpdate(): Promise<UpdateCheck>;
  downloadUpdate(): Promise<void>;
  onUpdateProgress(listener: (progress: UpdateProgress) => void): () => void;
  saveQuizPdf(html: string, filename: string): Promise<boolean>;
  startMobile(seed: MobileSessionSeed): Promise<string>;
  stopMobile(): Promise<void>;
  patchMobile(patch: MobilePatch): Promise<MobileSession | null>;
  onMobileSnapshot(listener: (session: MobileSession) => void): () => void;
  onMobileConnected(listener: () => void): () => void;
  setNativeTheme(theme: "light" | "dark"): void;
}
