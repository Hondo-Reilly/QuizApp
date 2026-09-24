import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { nanoid } from "nanoid";
import { parseQuiz } from "../../shared/schema";
import { collectDescendantFolderIds, toMetadata } from "../../shared/library";
import { allocateStorageId, slugifyTitle } from "../../shared/storageId";
import { DamagedStoreError, readJsonIfPresent, writeJsonAtomic } from "./durableJson";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizMetadata,
} from "../../shared/types";
import { deleteAttemptsForQuizzes } from "./attemptStore";
import { createMutationQueue } from "./mutationQueue";
import { indexFile, quizFile, quizzesDir } from "./paths";

const libraryWrites = createMutationQueue();

export function enqueueLibraryWrite<T>(task: () => Promise<T>): Promise<T> {
  return libraryWrites.enqueue(task);
}

const INDEX_VERSION = 2;

interface IndexFile {
  version: number;
  folders: Folder[];
  quizzes: QuizMetadata[];
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(quizzesDir(), { recursive: true });
}

function emptyIndex(): IndexFile {
  return { version: INDEX_VERSION, folders: [], quizzes: [] };
}

function migrateV1(rawArray: unknown[]): IndexFile {
  const quizzes = rawArray
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => {
      const meta = q as unknown as QuizMetadata;
      return { ...meta, folderId: meta.folderId ?? null };
    });
  return { version: INDEX_VERSION, folders: [], quizzes };
}

async function readIndex(): Promise<IndexFile> {
  await ensureDir();
  const parsed = await readJsonIfPresent(indexFile());
  if (parsed === undefined) return emptyIndex();
  if (Array.isArray(parsed)) {
    const migrated = migrateV1(parsed);
    await writeIndex(migrated);
    return migrated;
  }
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Partial<IndexFile>;
    const hasFolders = Array.isArray(obj.folders);
    const hasQuizzes = Array.isArray(obj.quizzes);
    if (!hasFolders && !hasQuizzes) throw new DamagedStoreError(indexFile());
    return {
      version: INDEX_VERSION,
      folders: hasFolders ? obj.folders! : [],
      quizzes: hasQuizzes
        ? obj.quizzes!.map((q) => ({ ...q, folderId: q.folderId ?? null }))
        : [],
    };
  }
  throw new DamagedStoreError(indexFile());
}

async function writeIndex(index: IndexFile): Promise<void> {
  await writeJsonAtomic(indexFile(), index);
}

export async function librarySnapshot(): Promise<LibrarySnapshot> {
  const index = await readIndex();
  const quizzes = index.quizzes
    .slice()
    .sort(
      (a, b) =>
        new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
    );
  const folders = index.folders
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  return { folders, quizzes };
}

export async function listQuizzes(): Promise<QuizMetadata[]> {
  const snap = await librarySnapshot();
  return snap.quizzes;
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  let path: string;
  try {
    path = quizFile(id);
  } catch {
    return null;
  }
  if (!existsSync(path)) return null;
  const raw = await fs.readFile(path, "utf-8");
  const parsed = parseQuiz(JSON.parse(raw));
  return { ...parsed, id: parsed.id ?? id } as Quiz;
}

export function deleteQuiz(id: string): Promise<void> {
  return libraryWrites.enqueue(() => removeQuiz(id));
}

async function removeQuiz(id: string): Promise<void> {
  let path: string;
  try {
    path = quizFile(id);
  } catch {
    return;
  }
  if (existsSync(path)) await fs.unlink(path);
  const index = await readIndex();
  await writeIndex({
    ...index,
    quizzes: index.quizzes.filter((q) => q.id !== id),
  });
  await deleteAttemptsForQuizzes([id]);
}

export function importQuizFromFile(
  sourcePath: string,
  folderId: string | null = null,
): Promise<QuizMetadata> {
  return libraryWrites.enqueue(() => importQuizFile(sourcePath, folderId));
}

async function importQuizFile(
  sourcePath: string,
  folderId: string | null = null,
): Promise<QuizMetadata> {
  const raw = await fs.readFile(sourcePath, "utf-8");
  const data = JSON.parse(raw);
  const parsed = parseQuiz(data);

  const index = await readIndex();
  const existingIds = new Set(index.quizzes.map((q) => q.id));

  const id = allocateStorageId(
    parsed.id,
    parsed.title,
    existingIds,
    () => nanoid(6),
  );

  const quiz: Quiz = { ...parsed, id } as Quiz;
  await ensureDir();
  await fs.writeFile(quizFile(id), JSON.stringify(quiz, null, 2), "utf-8");

  const folderExists =
    folderId === null || index.folders.some((f) => f.id === folderId);
  const resolvedFolderId = folderExists ? folderId : null;

  const meta = toMetadata(quiz, new Date().toISOString(), resolvedFolderId);
  await writeIndex({
    ...index,
    quizzes: [...index.quizzes.filter((q) => q.id !== id), meta],
  });
  return meta;
}

export interface CreateFolderInput {
  name: string;
  description?: string;
  parentId?: string | null;
}

export function createFolder(input: CreateFolderInput): Promise<Folder> {
  return libraryWrites.enqueue(() => addFolder(input));
}

async function addFolder(input: CreateFolderInput): Promise<Folder> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("Folder name is required");

  const index = await readIndex();
  const parentId = input.parentId ?? null;
  if (parentId !== null && !index.folders.some((f) => f.id === parentId)) {
    throw new Error("Parent folder not found");
  }

  const baseSlug = slugifyTitle(trimmed);
  const existingIds = new Set(index.folders.map((f) => f.id));
  const id = existingIds.has(baseSlug) ? `${baseSlug}-${nanoid(6)}` : baseSlug;

  const folder: Folder = {
    id,
    name: trimmed,
    description: input.description?.trim() || undefined,
    parentId,
    createdAt: new Date().toISOString(),
  };
  await writeIndex({ ...index, folders: [...index.folders, folder] });
  return folder;
}

export interface UpdateFolderInput {
  id: string;
  name?: string;
  description?: string;
}

export function updateFolder(input: UpdateFolderInput): Promise<Folder> {
  return libraryWrites.enqueue(() => editFolder(input));
}

async function editFolder(input: UpdateFolderInput): Promise<Folder> {
  const index = await readIndex();
  const existing = index.folders.find((f) => f.id === input.id);
  if (!existing) throw new Error("Folder not found");

  const next: Folder = {
    ...existing,
    name: input.name?.trim() || existing.name,
    description:
      input.description === undefined
        ? existing.description
        : input.description.trim() || undefined,
  };
  await writeIndex({
    ...index,
    folders: index.folders.map((f) => (f.id === input.id ? next : f)),
  });
  return next;
}

export function deleteFolder(
  id: string,
  opts: { recursive?: boolean } = {},
): Promise<void> {
  return libraryWrites.enqueue(() => removeFolder(id, opts));
}

async function removeFolder(
  id: string,
  opts: { recursive?: boolean } = {},
): Promise<void> {
  const index = await readIndex();
  if (!index.folders.some((f) => f.id === id)) return;

  const toRemove = collectDescendantFolderIds(index.folders, id);

  const quizzesToDelete = index.quizzes.filter(
    (q) => q.folderId && toRemove.has(q.folderId),
  );
  if (!opts.recursive && quizzesToDelete.length > 0) {
    throw new Error("Folder is not empty");
  }

  for (const q of quizzesToDelete) {
    let path: string;
    try {
      path = quizFile(q.id);
    } catch {
      continue;
    }
    if (existsSync(path)) await fs.unlink(path);
  }

  await writeIndex({
    ...index,
    folders: index.folders.filter((f) => !toRemove.has(f.id)),
    quizzes: index.quizzes.filter(
      (q) => !(q.folderId && toRemove.has(q.folderId)),
    ),
  });
  await deleteAttemptsForQuizzes(quizzesToDelete.map((q) => q.id));
}

export function moveQuiz(
  quizId: string,
  folderId: string | null,
): Promise<void> {
  return libraryWrites.enqueue(() => relocateQuiz(quizId, folderId));
}

async function relocateQuiz(
  quizId: string,
  folderId: string | null,
): Promise<void> {
  const index = await readIndex();
  if (!index.quizzes.some((q) => q.id === quizId)) {
    throw new Error("Quiz not found");
  }
  if (folderId !== null && !index.folders.some((f) => f.id === folderId)) {
    throw new Error("Target folder not found");
  }
  await writeIndex({
    ...index,
    quizzes: index.quizzes.map((q) =>
      q.id === quizId ? { ...q, folderId } : q,
    ),
  });
}
