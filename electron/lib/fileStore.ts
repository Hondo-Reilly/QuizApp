import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { nanoid } from "nanoid";
import { parseQuiz } from "../../shared/schema";
import type {
  Folder,
  LibrarySnapshot,
  Quiz,
  QuizMetadata,
} from "../../shared/types";
import { deleteAttemptsForQuizzes } from "./attemptStore";
import { indexFile, quizFile, quizzesDir } from "./paths";

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
  if (!existsSync(indexFile())) return emptyIndex();
  try {
    const raw = await fs.readFile(indexFile(), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const migrated = migrateV1(parsed);
      await writeIndex(migrated);
      return migrated;
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Partial<IndexFile>;
      return {
        version: INDEX_VERSION,
        folders: Array.isArray(obj.folders) ? obj.folders : [],
        quizzes: Array.isArray(obj.quizzes)
          ? obj.quizzes.map((q) => ({ ...q, folderId: q.folderId ?? null }))
          : [],
      };
    }
    return emptyIndex();
  } catch {
    return emptyIndex();
  }
}

async function writeIndex(index: IndexFile): Promise<void> {
  await ensureDir();
  await fs.writeFile(indexFile(), JSON.stringify(index, null, 2), "utf-8");
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
  const path = quizFile(id);
  if (!existsSync(path)) return null;
  const raw = await fs.readFile(path, "utf-8");
  const parsed = parseQuiz(JSON.parse(raw));
  return { ...parsed, id: parsed.id ?? id } as Quiz;
}

export async function deleteQuiz(id: string): Promise<void> {
  const path = quizFile(id);
  if (existsSync(path)) await fs.unlink(path);
  const index = await readIndex();
  await writeIndex({
    ...index,
    quizzes: index.quizzes.filter((q) => q.id !== id),
  });
  await deleteAttemptsForQuizzes([id]);
}

export async function importQuizFromFile(
  sourcePath: string,
  folderId: string | null = null,
): Promise<QuizMetadata> {
  const raw = await fs.readFile(sourcePath, "utf-8");
  const data = JSON.parse(raw);
  const parsed = parseQuiz(data);

  const index = await readIndex();
  const existingIds = new Set(index.quizzes.map((q) => q.id));

  let id = parsed.id ?? slugify(parsed.title);
  if (!parsed.id || existingIds.has(id)) {
    const base = slugify(parsed.title);
    id = existingIds.has(base) ? `${base}-${nanoid(6)}` : base;
  }

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

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("Folder name is required");

  const index = await readIndex();
  const parentId = input.parentId ?? null;
  if (parentId !== null && !index.folders.some((f) => f.id === parentId)) {
    throw new Error("Parent folder not found");
  }

  const baseSlug = slugify(trimmed);
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

export async function updateFolder(input: UpdateFolderInput): Promise<Folder> {
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

function collectDescendantFolderIds(
  folders: Folder[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, Folder[]>();
  for (const f of folders) {
    if (!f.parentId) continue;
    const list = childrenByParent.get(f.parentId);
    if (list) list.push(f);
    else childrenByParent.set(f.parentId, [f]);
  }
  const ids = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    const children = childrenByParent.get(id) ?? [];
    for (const c of children) stack.push(c.id);
  }
  return ids;
}

export async function deleteFolder(
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
    const path = quizFile(q.id);
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

export async function moveQuiz(
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
