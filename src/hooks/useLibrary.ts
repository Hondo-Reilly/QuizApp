import { useCallback, useEffect, useMemo, useState } from "react";
import { quizApi } from "@/api/quizApi";
import type { Folder, QuizMetadata } from "@shared/types";
import type {
  CreateFolderPayload,
  UpdateFolderPayload,
} from "../../electron/preload";

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
  importQuizzes: (folderId: string | null) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  moveQuiz: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (payload: CreateFolderPayload) => Promise<Folder>;
  updateFolder: (payload: UpdateFolderPayload) => Promise<Folder>;
  deleteFolder: (id: string, recursive?: boolean) => Promise<void>;
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      await quizApi.deleteQuiz(id);
      await refresh();
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
      await quizApi.deleteFolder(id, recursive);
      await refresh();
    },
    [refresh],
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
    importQuizzes,
    deleteQuiz,
    moveQuiz,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
