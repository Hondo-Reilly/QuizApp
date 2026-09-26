import { nanoid } from "nanoid";
import { collectDescendantFolderIds, toMetadata } from "@shared/library";
import { parseQuiz } from "@shared/schema";
import { imageContentType, imageRefs } from "@shared/quizContent";
import { convertSvgImages, readQuizFile, writeQuizPackage } from "@shared/quizPackage";
import { base64ToBytes, rasterizeSvgInPage } from "@shared/svgRaster";
import { allocateStorageId, slugifyTitle } from "@shared/storageId";
import type { Folder, LibrarySnapshot, Quiz, QuizMetadata } from "@shared/types";
import type { CreateFolderPayload, UpdateFolderPayload } from "@shared/quizApi";
import { attemptChangesWithoutQuizzes } from "./browserAttempts";
import {
  assetKey,
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

export async function importQuizBytes(
  bytes: Uint8Array,
  folderId: string | null,
  sourceName: string,
): Promise<QuizMetadata> {
  let parsed: ReturnType<typeof readQuizFile>;
  try {
    parsed = await convertSvgImages(readQuizFile(bytes), async (svg) =>
      base64ToBytes(await rasterizeSvgInPage(svg)),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to import ${sourceName}: ${message}`);
  }

  const library = await readLibrary();
  const existingIds = new Set(library.quizzes.map((quiz) => quiz.id));
  const id = allocateStorageId(
    parsed.quiz.id,
    parsed.quiz.title,
    existingIds,
    () => nanoid(6),
  );
  const quiz = { ...parsed.quiz, id } as Quiz;
  const folderExists =
    folderId === null || library.folders.some((folder) => folder.id === folderId);
  const meta = toMetadata(
    quiz,
    new Date().toISOString(),
    folderExists ? folderId : null,
  );
  const assetChanges: RecordChange[] = [...parsed.assets].map(([path, data]) => ({
    key: assetKey(id, path),
    value: { type: imageContentType(path), data },
  }));
  await changeRecords([
    ...assetChanges,
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

/** Deletes for a quiz record and every image it references. */
async function quizRecordDeletes(id: string): Promise<RecordChange[]> {
  const stored = await readRecord<Quiz>(quizKey(id));
  const paths = stored ? imageRefs(stored) : [];
  return [
    { key: quizKey(id), delete: true },
    ...paths.map((path) => ({ key: assetKey(id, path), delete: true as const })),
  ];
}

interface StoredAsset {
  type: string;
  data: Uint8Array;
}

export async function readBrowserAssets(
  quizId: string,
  paths: readonly string[],
): Promise<Map<string, StoredAsset>> {
  const out = new Map<string, StoredAsset>();
  for (const path of paths) {
    const asset = await readRecord<StoredAsset>(assetKey(quizId, path));
    if (asset) out.set(path, asset);
  }
  return out;
}

/** Builds a .quiz package from a stored quiz and its images. */
export async function exportBrowserQuiz(
  id: string,
): Promise<{ title: string; bytes: Uint8Array } | null> {
  const quiz = await getBrowserQuiz(id);
  if (!quiz) return null;
  const stored = await readBrowserAssets(id, imageRefs(quiz));
  const assets = new Map([...stored].map(([path, asset]) => [path, asset.data]));
  return { title: quiz.title, bytes: writeQuizPackage(quiz, assets) };
}

export async function getBrowserQuiz(id: string): Promise<Quiz | null> {
  const stored = await readRecord<Quiz>(quizKey(id));
  if (!stored) return null;
  const parsed = parseQuiz(stored);
  return { ...parsed, id: parsed.id ?? id } as Quiz;
}

export async function deleteBrowserQuiz(id: string): Promise<void> {
  const library = await readLibrary();
  const attemptChanges = await attemptChangesWithoutQuizzes([id]);
  const changes: RecordChange[] = [
    ...(await quizRecordDeletes(id)),
    {
      key: LIBRARY_KEY,
      value: {
        ...library,
        quizzes: library.quizzes.filter((quiz) => quiz.id !== id),
      },
    },
  ];
  changes.push(...attemptChanges);
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
  const attemptChanges = await attemptChangesWithoutQuizzes(
    quizzesToDelete.map((quiz) => quiz.id),
  );
  const changes: RecordChange[] = [];
  for (const quiz of quizzesToDelete) changes.push(...(await quizRecordDeletes(quiz.id)));
  changes.push({
    key: LIBRARY_KEY,
    value: {
      folders: library.folders.filter((folder) => !toRemove.has(folder.id)),
      quizzes: library.quizzes.filter(
        (quiz) => !(quiz.folderId && toRemove.has(quiz.folderId)),
      ),
    },
  });
  changes.push(...attemptChanges);
  await changeRecords(changes);
}
