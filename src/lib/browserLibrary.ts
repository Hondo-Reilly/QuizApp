import { nanoid } from "nanoid";
import { collectDescendantFolderIds, toMetadata } from "@shared/library";
import { parseQuiz } from "@shared/schema";
import { allocateStorageId, slugifyTitle } from "@shared/storageId";
import type { Folder, LibrarySnapshot, Quiz, QuizMetadata } from "@shared/types";
import type { CreateFolderPayload, UpdateFolderPayload } from "@shared/quizApi";
import { attemptsWithoutQuizzes } from "./browserAttempts";
import {
  ATTEMPTS_KEY,
  changeRecords,
  LIBRARY_KEY,
  quizKey,
  readRecord,
  type RecordChange,
} from "./idbRecords";

interface LibraryRecord {
  folders: Folder[];
  quizzes: QuizMetadata[];
}

async function readLibrary(): Promise<LibraryRecord> {
  const stored = await readRecord<LibraryRecord>(LIBRARY_KEY);
  return {
    folders: stored?.folders ?? [],
    quizzes: stored?.quizzes ?? [],
  };
}

export async function librarySnapshot(): Promise<LibrarySnapshot> {
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

export async function importQuizText(
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
  const id = allocateStorageId(
    parsed.id,
    parsed.title,
    existingIds,
    () => nanoid(6),
  );
  const quiz = { ...parsed, id } as Quiz;
  const folderExists =
    folderId === null || library.folders.some((folder) => folder.id === folderId);
  const meta = toMetadata(
    quiz,
    new Date().toISOString(),
    folderExists ? folderId : null,
  );
  await changeRecords([
    { key: quizKey(id), value: quiz },
    {
      key: LIBRARY_KEY,
      value: {
        ...library,
        quizzes: [...library.quizzes.filter((item) => item.id !== id), meta],
      },
    },
  ]);
  return meta;
}

export async function getBrowserQuiz(id: string): Promise<Quiz | null> {
  const stored = await readRecord<Quiz>(quizKey(id));
  if (!stored) return null;
  const parsed = parseQuiz(stored);
  return { ...parsed, id: parsed.id ?? id } as Quiz;
}

export async function deleteBrowserQuiz(id: string): Promise<void> {
  const library = await readLibrary();
  const nextAttempts = await attemptsWithoutQuizzes([id]);
  const changes: RecordChange[] = [
    { key: quizKey(id), delete: true },
    {
      key: LIBRARY_KEY,
      value: {
        ...library,
        quizzes: library.quizzes.filter((quiz) => quiz.id !== id),
      },
    },
  ];
  if (nextAttempts) changes.push({ key: ATTEMPTS_KEY, value: nextAttempts });
  await changeRecords(changes);
}

export async function moveBrowserQuiz(
  id: string,
  folderId: string | null,
): Promise<void> {
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
  await changeRecords([
    {
      key: LIBRARY_KEY,
      value: {
        ...library,
        quizzes: library.quizzes.map((quiz) =>
          quiz.id === id ? { ...quiz, folderId } : quiz,
        ),
      },
    },
  ]);
}

export async function createBrowserFolder(
  payload: CreateFolderPayload,
): Promise<Folder> {
  const trimmed = payload.name.trim();
  if (!trimmed) throw new Error("Folder name is required");
  const library = await readLibrary();
  const parentId = payload.parentId ?? null;
  if (parentId !== null && !library.folders.some((folder) => folder.id === parentId)) {
    throw new Error("Parent folder not found");
  }
  const baseSlug = slugifyTitle(trimmed);
  const existingIds = new Set(library.folders.map((folder) => folder.id));
  const id = existingIds.has(baseSlug) ? `${baseSlug}-${nanoid(6)}` : baseSlug;
  const folder: Folder = {
    id,
    name: trimmed,
    description: payload.description?.trim() || undefined,
    parentId,
    createdAt: new Date().toISOString(),
  };
  await changeRecords([
    {
      key: LIBRARY_KEY,
      value: { ...library, folders: [...library.folders, folder] },
    },
  ]);
  return folder;
}

export async function updateBrowserFolder(
  payload: UpdateFolderPayload,
): Promise<Folder> {
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
  await changeRecords([
    {
      key: LIBRARY_KEY,
      value: {
        ...library,
        folders: library.folders.map((folder) =>
          folder.id === payload.id ? next : folder,
        ),
      },
    },
  ]);
  return next;
}

export async function deleteBrowserFolder(
  id: string,
  recursive = true,
): Promise<void> {
  const library = await readLibrary();
  if (!library.folders.some((folder) => folder.id === id)) return;
  const toRemove = collectDescendantFolderIds(library.folders, id);
  const quizzesToDelete = library.quizzes.filter(
    (quiz) => quiz.folderId && toRemove.has(quiz.folderId),
  );
  if (!recursive && quizzesToDelete.length > 0) {
    throw new Error("Folder is not empty");
  }
  const nextAttempts = await attemptsWithoutQuizzes(
    quizzesToDelete.map((quiz) => quiz.id),
  );
  const changes: RecordChange[] = quizzesToDelete.map((quiz) => ({
    key: quizKey(quiz.id),
    delete: true as const,
  }));
  changes.push({
    key: LIBRARY_KEY,
    value: {
      folders: library.folders.filter((folder) => !toRemove.has(folder.id)),
      quizzes: library.quizzes.filter(
        (quiz) => !(quiz.folderId && toRemove.has(quiz.folderId)),
      ),
    },
  });
  if (nextAttempts) changes.push({ key: ATTEMPTS_KEY, value: nextAttempts });
  await changeRecords(changes);
}
