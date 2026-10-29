import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { quizApi } from "@/api/quizApi";
import { forgetQuiz } from "@/lib/quizPageCache";
import { keepLocalPrompt, liveShare } from "@/lib/shareText";
import { collectDescendantFolderIds } from "@shared/library";
import type { CreateFolderPayload, UpdateFolderPayload } from "@shared/quizApi";
import type { Folder, QuizMetadata } from "@shared/types";

export interface UseLibrary {
  folders: Folder[];
  quizzes: QuizMetadata[];
  loading: boolean;
  error: string | null;

  foldersIn: (parentId: string | null) => Folder[];
  quizzesIn: (folderId: string | null) => QuizMetadata[];
  pathTo: (folderId: string | null) => Folder[];
  countsByFolder: Map<string, number>;
  folderById: Map<string, Folder>;

  refresh: () => Promise<void>;
  /** Reloads the library without showing the loading state. */
  reload: () => Promise<void>;
  importQuizzes: (folderId: string | null) => Promise<void>;
  /** Resolves false when the user kept the quiz after its shared copy could not be deleted. */
  deleteQuiz: (id: string) => Promise<boolean>;
  moveQuiz: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (payload: CreateFolderPayload) => Promise<Folder>;
  updateFolder: (payload: UpdateFolderPayload) => Promise<Folder>;
  deleteFolder: (id: string, recursive?: boolean) => Promise<void>;
  /** Resolves null when the file picker was cancelled. */
  replaceQuizFromFile: (id: string) => Promise<QuizMetadata | null>;
  importSharedQuiz: (code: string, folderId: string | null) => Promise<QuizMetadata>;
  updateSharedQuiz: (id: string) => Promise<QuizMetadata>;
  /** Checks share codes for updates. Without force, skips if checked recently. */
  checkSharedQuizzes: (force?: boolean) => Promise<void>;
}

/** Background update checks run at most this often. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastSharedCheck = 0;

function hasCodesToCheck(quizzes: readonly QuizMetadata[]): boolean {
  return quizzes.some(
    (quiz) => (quiz.cloudSource && !quiz.cloudSource.gone) || (quiz.share && !quiz.share.gone),
  );
}

function buildCounts(
  folders: Folder[],
  quizzes: QuizMetadata[],
): Map<string, number> {
  const parentOf = new Map(folders.map((f) => [f.id, f.parentId]));
  const counts = new Map<string, number>();
  for (const q of quizzes) {
    let cur: string | null = q.folderId ?? null;
    while (cur != null) {
      counts.set(cur, (counts.get(cur) ?? 0) + 1);
      cur = parentOf.get(cur) ?? null;
    }
  }
  return counts;
}

export function useLibrary(): UseLibrary {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [quizzes, setQuizzes] = useState<QuizMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await quizApi.librarySnapshot();
      setFolders(snap.folders);
      setQuizzes(snap.quizzes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reloads the library without showing the loading state. */
  const reload = useCallback(async () => {
    const snap = await quizApi.librarySnapshot();
    setFolders(snap.folders);
    setQuizzes(snap.quizzes);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const quizzesRef = useRef(quizzes);
  quizzesRef.current = quizzes;

  const checkSharedQuizzes = useCallback(
    async (force = false) => {
      if (!force && Date.now() - lastSharedCheck < CHECK_INTERVAL_MS) return;
      if (!force && !hasCodesToCheck(quizzesRef.current)) return;
      lastSharedCheck = Date.now();
      await quizApi.checkSharedQuizzes();
      await reload();
    },
    [reload],
  );

  // Look for updates once the library has loaded, then every few hours.
  // A failed background check (offline, server down) waits for the next one.
  useEffect(() => {
    if (loading) return;
    void checkSharedQuizzes().catch(() => undefined);
    const timer = window.setInterval(
      () => void checkSharedQuizzes().catch(() => undefined),
      CHECK_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [loading, checkSharedQuizzes]);

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  const countsByFolder = useMemo(
    () => buildCounts(folders, quizzes),
    [folders, quizzes],
  );

  const foldersIn = useCallback(
    (parentId: string | null) => folders.filter((f) => f.parentId === parentId),
    [folders],
  );

  const quizzesIn = useCallback(
    (folderId: string | null) =>
      quizzes.filter((q) => (q.folderId ?? null) === folderId),
    [quizzes],
  );

  const pathTo = useCallback(
    (folderId: string | null): Folder[] => {
      const path: Folder[] = [];
      let cur: string | null = folderId;
      const guard = new Set<string>();
      while (cur != null && !guard.has(cur)) {
        guard.add(cur);
        const f = folderById.get(cur);
        if (!f) break;
        path.unshift(f);
        cur = f.parentId;
      }
      return path;
    },
    [folderById],
  );

  const importQuizzes = useCallback(
    async (folderId: string | null) => {
      setError(null);
      const result = await quizApi.importQuiz(folderId);
      if (result.cancelled) return;
      if ((result.imported?.length ?? 0) > 0 || result.ok) await refresh();
      if (!result.ok && result.error) setError(result.error);
    },
    [refresh],
  );

  const deleteQuiz = useCallback(
    async (id: string) => {
      setError(null);
      const meta = quizzesRef.current.find((quiz) => quiz.id === id);
      if (meta && liveShare(meta)) {
        try {
          await quizApi.unshareQuiz(id);
        } catch (err) {
          if (!confirm(keepLocalPrompt(err, `"${meta.title}"`))) return false;
        }
      }
      await quizApi.deleteQuiz(id);
      forgetQuiz(id);
      await refresh();
      return true;
    },
    [refresh],
  );

  const moveQuiz = useCallback(
    async (id: string, folderId: string | null) => {
      setError(null);
      await quizApi.moveQuiz(id, folderId);
      await refresh();
    },
    [refresh],
  );

  const createFolder = useCallback(
    async (payload: CreateFolderPayload) => {
      setError(null);
      const folder = await quizApi.createFolder(payload);
      await refresh();
      return folder;
    },
    [refresh],
  );

  const updateFolder = useCallback(
    async (payload: UpdateFolderPayload) => {
      setError(null);
      const folder = await quizApi.updateFolder(payload);
      await refresh();
      return folder;
    },
    [refresh],
  );

  const deleteFolder = useCallback(
    async (id: string, recursive = true) => {
      setError(null);
      const folderIds = collectDescendantFolderIds(folders, id);
      const inside = quizzes.filter(
        (quiz) => quiz.folderId && folderIds.has(quiz.folderId),
      );
      const quizIds = inside.map((quiz) => quiz.id);
      const failures: unknown[] = [];
      for (const quiz of inside.filter((item) => liveShare(item))) {
        try {
          await quizApi.unshareQuiz(quiz.id);
        } catch (err) {
          failures.push(err);
        }
      }
      if (failures.length > 0 && !confirm(keepLocalPrompt(failures[0], "the folder"))) {
        await reload();
        return;
      }
      await quizApi.deleteFolder(id, recursive);
      for (const quizId of quizIds) forgetQuiz(quizId);
      await refresh();
    },
    [folders, quizzes, refresh, reload],
  );

  const replaceQuizFromFile = useCallback(
    async (id: string) => {
      const meta = await quizApi.replaceQuizFromFile(id);
      if (!meta) return null;
      forgetQuiz(id);
      await reload();
      return meta;
    },
    [reload],
  );

  const importSharedQuiz = useCallback(
    async (code: string, folderId: string | null) => {
      setError(null);
      const meta = await quizApi.importSharedQuiz(code, folderId);
      await reload();
      return meta;
    },
    [reload],
  );

  const updateSharedQuiz = useCallback(
    async (id: string) => {
      const meta = await quizApi.updateSharedQuiz(id);
      forgetQuiz(id);
      await reload();
      return meta;
    },
    [reload],
  );

  return {
    folders,
    quizzes,
    loading,
    error,
    foldersIn,
    quizzesIn,
    pathTo,
    countsByFolder,
    folderById,
    refresh,
    reload,
    importQuizzes,
    deleteQuiz,
    moveQuiz,
    createFolder,
    updateFolder,
    deleteFolder,
    replaceQuizFromFile,
    importSharedQuiz,
    updateSharedQuiz,
    checkSharedQuizzes,
  };
}
