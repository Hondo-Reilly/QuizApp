import type { ImportFailure } from "./importBatch";
import type { MobilePatch, MobileSession, MobileSessionSeed } from "./mobile";
import type {
  AttemptScore,
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizAttempt,
  QuizMetadata,
  SaveAttemptInput,
  SelfMark,
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
  /** Saves a quiz and its images as a .quiz package. Resolves false if cancelled. */
  exportQuiz(id: string): Promise<boolean>;
  /** Maps each images/ path of a quiz to a URL an <img> can load. */
  getQuizAssetUrls(quizId: string, paths: string[]): Promise<Record<string, string>>;
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
  /** Replaces which questions of a saved attempt are flagged to study. */
  setAttemptFlags(attemptId: string, flagged: string[]): Promise<QuizAttempt>;
  /** Replaces the self-marks of an attempt that allows them, with its new score. */
  setAttemptSelfMarks(
    attemptId: string,
    selfMarks: Record<string, SelfMark>,
    score: AttemptScore,
  ): Promise<QuizAttempt>;
  /** Maps photo file names of a saved attempt to URLs an <img> can load. */
  getAttemptPhotoUrls(attemptId: string, names: string[]): Promise<Record<string, string>>;
  /** Desktop only: a photo the phone uploaded during mobile mode. */
  getMobilePhoto(name: string): Promise<Uint8Array | null>;
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
