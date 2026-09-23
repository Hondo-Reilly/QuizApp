import { nanoid } from "nanoid";
import type { QuizApi } from "../../electron/preload";
import { parseQuiz } from "@shared/schema";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizAttempt,
  QuizMetadata,
  SaveAttemptInput,
  UpdateCheck,
  UpdateProgress,
} from "@shared/types";

const DB_NAME = "quizapp";
const DB_VERSION = 1;
const STORE = "records";
const LIBRARY_KEY = "library";
const ATTEMPTS_KEY = "attempts";

interface LibraryRecord {
  folders: Folder[];
  quizzes: QuizMetadata[];
}

let chain: Promise<unknown> = Promise.resolve();

function run<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function quizKey(id: string): string {
  return `quiz:${id}`;
}

async function readKey<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function writeKey(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteKey(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readLibrary(): Promise<LibraryRecord> {
  const stored = await readKey<LibraryRecord>(LIBRARY_KEY);
  return {
    folders: stored?.folders ?? [],
    quizzes: stored?.quizzes ?? [],
  };
}

async function readAttempts(): Promise<QuizAttempt[]> {
  return (await readKey<QuizAttempt[]>(ATTEMPTS_KEY)) ?? [];
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "quiz"
  );
}

function toMetadata(
  quiz: Quiz,
  importedAt: string,
  folderId: string | null,
): QuizMetadata {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    questionCount: quiz.questions.length,
    importedAt,
    folderId,
  };
}

function collectDescendantFolderIds(folders: Folder[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, Folder[]>();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const list = childrenByParent.get(folder.parentId);
    if (list) list.push(folder);
    else childrenByParent.set(folder.parentId, [folder]);
  }
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}

function pickQuizFiles(): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.multiple = true;
    let settled = false;
    const finish = (files: File[] | null) => {
      if (settled) return;
      settled = true;
      resolve(files);
    };
    input.addEventListener("change", () => {
      finish(Array.from(input.files ?? []));
    });
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => finish(null), 1000);
      },
      { once: true },
    );
    input.click();
  });
}

async function importQuizText(
  raw: string,
  folderId: string | null,
  sourceName: string,
): Promise<QuizMetadata> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to import ${sourceName}: that file is not valid JSON.`);
  }
  let parsed: ReturnType<typeof parseQuiz>;
  try {
    parsed = parseQuiz(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to import ${sourceName}: ${message}`);
  }

  const library = await readLibrary();
  const existingIds = new Set(library.quizzes.map((quiz) => quiz.id));
  let id = parsed.id ?? slugify(parsed.title);
  if (!parsed.id || existingIds.has(id)) {
    const base = slugify(parsed.title);
    id = existingIds.has(base) ? `${base}-${nanoid(6)}` : base;
  }

  const quiz = { ...parsed, id } as Quiz;
  await writeKey(quizKey(id), quiz);

  const folderExists =
    folderId === null || library.folders.some((folder) => folder.id === folderId);
  const meta = toMetadata(
    quiz,
    new Date().toISOString(),
    folderExists ? folderId : null,
  );
  await writeKey(LIBRARY_KEY, {
    ...library,
    quizzes: [...library.quizzes.filter((item) => item.id !== id), meta],
  });
  return meta;
}

async function deleteAttemptsForQuizzes(quizIds: string[]): Promise<void> {
  if (quizIds.length === 0) return;
  const drop = new Set(quizIds);
  const attempts = await readAttempts();
  const next = attempts.filter((attempt) => !drop.has(attempt.quizId));
  if (next.length !== attempts.length) await writeKey(ATTEMPTS_KEY, next);
}

function printHtml(html: string): Promise<boolean> {
  const iframe = document.createElement("iframe");
  iframe.title = "Print quiz";
  iframe.setAttribute(
    "style",
    "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0",
  );

  return new Promise((resolve) => {
    let settled = false;
    const finish = (printed: boolean) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve(printed);
    };

    iframe.onload = () => {
      const frame = iframe.contentWindow;
      if (!frame) {
        finish(false);
        return;
      }
      frame.addEventListener("afterprint", () => finish(true), { once: true });
      window.setTimeout(() => finish(true), 60_000);
      frame.focus();
      frame.print();
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

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
      for (const file of files) {
        try {
          imported.push(await importQuizText(await file.text(), folderId, file.name));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false, error: message, imported };
        }
      }
      return { ok: true, imported };
    }),
  listQuizzes: () =>
    run(async () => {
      const snap = await librarySnapshot();
      return snap.quizzes;
    }),
  getQuiz: (id) =>
    run(async () => {
      const stored = await readKey<Quiz>(quizKey(id));
      if (!stored) return null;
      const parsed = parseQuiz(stored);
      return { ...parsed, id: parsed.id ?? id } as Quiz;
    }),
  deleteQuiz: (id) =>
    run(async () => {
      await deleteKey(quizKey(id));
      const library = await readLibrary();
      await writeKey(LIBRARY_KEY, {
        ...library,
        quizzes: library.quizzes.filter((quiz) => quiz.id !== id),
      });
      await deleteAttemptsForQuizzes([id]);
    }),
  moveQuiz: (id, folderId) =>
    run(async () => {
      const library = await readLibrary();
      if (!library.quizzes.some((quiz) => quiz.id === id)) {
        throw new Error("Quiz not found");
      }
      if (
        folderId !== null &&
        !library.folders.some((folder) => folder.id === folderId)
      ) {
        throw new Error("Target folder not found");
      }
      await writeKey(LIBRARY_KEY, {
        ...library,
        quizzes: library.quizzes.map((quiz) =>
          quiz.id === id ? { ...quiz, folderId } : quiz,
        ),
      });
    }),
  librarySnapshot: () => run(librarySnapshot),
  createFolder: (payload) =>
    run(async () => {
      const trimmed = payload.name.trim();
      if (!trimmed) throw new Error("Folder name is required");
      const library = await readLibrary();
      const parentId = payload.parentId ?? null;
      if (parentId !== null && !library.folders.some((folder) => folder.id === parentId)) {
        throw new Error("Parent folder not found");
      }
      const baseSlug = slugify(trimmed);
      const existingIds = new Set(library.folders.map((folder) => folder.id));
      const id = existingIds.has(baseSlug) ? `${baseSlug}-${nanoid(6)}` : baseSlug;
      const folder: Folder = {
        id,
        name: trimmed,
        description: payload.description?.trim() || undefined,
        parentId,
        createdAt: new Date().toISOString(),
      };
      await writeKey(LIBRARY_KEY, {
        ...library,
        folders: [...library.folders, folder],
      });
      return folder;
    }),
  updateFolder: (payload) =>
    run(async () => {
      const library = await readLibrary();
      const existing = library.folders.find((folder) => folder.id === payload.id);
      if (!existing) throw new Error("Folder not found");
      const next: Folder = {
        ...existing,
        name: payload.name?.trim() || existing.name,
        description:
          payload.description === undefined
            ? existing.description
            : payload.description.trim() || undefined,
      };
      await writeKey(LIBRARY_KEY, {
        ...library,
        folders: library.folders.map((folder) =>
          folder.id === payload.id ? next : folder,
        ),
      });
      return next;
    }),
  deleteFolder: (id, recursive = true) =>
    run(async () => {
      const library = await readLibrary();
      if (!library.folders.some((folder) => folder.id === id)) return;
      const toRemove = collectDescendantFolderIds(library.folders, id);
      const quizzesToDelete = library.quizzes.filter(
        (quiz) => quiz.folderId && toRemove.has(quiz.folderId),
      );
      if (!recursive && quizzesToDelete.length > 0) {
        throw new Error("Folder is not empty");
      }
      for (const quiz of quizzesToDelete) await deleteKey(quizKey(quiz.id));
      await writeKey(LIBRARY_KEY, {
        folders: library.folders.filter((folder) => !toRemove.has(folder.id)),
        quizzes: library.quizzes.filter(
          (quiz) => !(quiz.folderId && toRemove.has(quiz.folderId)),
        ),
      });
      await deleteAttemptsForQuizzes(quizzesToDelete.map((quiz) => quiz.id));
    }),
  saveAttempt: (input: SaveAttemptInput) =>
    run(async () => {
      const attempts = await readAttempts();
      const attempt: QuizAttempt = {
        id: nanoid(10),
        quizId: input.quizId,
        startedAt: input.startedAt,
        completedAt: new Date().toISOString(),
        correct: input.correct,
        total: input.total,
        percent: input.percent,
        questionIds: input.questionIds,
        answers: input.answers,
      };
      await writeKey(ATTEMPTS_KEY, [attempt, ...attempts]);
      return attempt;
    }),
  listAttempts: (quizId) =>
    run(async () => {
      const attempts = await readAttempts();
      return attempts
        .filter((attempt) => attempt.quizId === quizId)
        .sort(
          (a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
        );
    }),
  getAttempt: (id) =>
    run(async () => {
      const attempts = await readAttempts();
      return attempts.find((attempt) => attempt.id === id) ?? null;
    }),
  deleteAttempts: (ids) =>
    run(async () => {
      if (ids.length === 0) return;
      const drop = new Set(ids);
      const attempts = await readAttempts();
      const next = attempts.filter((attempt) => !drop.has(attempt.id));
      if (next.length !== attempts.length) await writeKey(ATTEMPTS_KEY, next);
    }),
  checkForUpdate: () => Promise.resolve(noUpdate),
  downloadUpdate: () => Promise.resolve(),
  onUpdateProgress: (_listener: (progress: UpdateProgress) => void) => () => undefined,
  saveQuizPdf: (html) => printHtml(html),
  startMobile: () => Promise.reject(new Error("Mobile mode is only available in the desktop app.")),
  stopMobile: () => Promise.resolve(),
  patchMobile: () => Promise.resolve(null),
  onMobileSnapshot: () => () => undefined,
  onMobileConnected: () => () => undefined,
  setNativeTheme: () => undefined,
};

async function librarySnapshot(): Promise<LibrarySnapshot> {
  const library = await readLibrary();
  return {
    folders: library.folders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
    quizzes: library.quizzes
      .slice()
      .sort(
        (a, b) =>
          new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
      ),
  };
}
