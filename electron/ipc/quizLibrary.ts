import { BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { importBatchMessage, type ImportFailure } from "../../shared/importBatch";
import { IpcChannels } from "../../shared/ipcChannels";
import {
  createFolder,
  deleteFolder,
  deleteQuiz,
  getQuiz,
  importQuizFromFile,
  librarySnapshot,
  listQuizzes,
  moveQuiz,
  updateFolder,
  type CreateFolderInput,
  type UpdateFolderInput,
} from "../lib/fileStore";

export interface ImportResult {
  ok: boolean;
  cancelled?: boolean;
  error?: string;
  imported?: Awaited<ReturnType<typeof importQuizFromFile>>[];
  failures?: ImportFailure[];
}

async function handleImport(
  event: Electron.IpcMainInvokeEvent,
  folderId: string | null = null,
): Promise<ImportResult> {
  const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const result = await dialog.showOpenDialog(window!, {
    title: "Import quiz",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Quiz JSON", extensions: ["json"] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, cancelled: true };
  }

  const imported: Awaited<ReturnType<typeof importQuizFromFile>>[] = [];
  const failures: ImportFailure[] = [];
  for (const filePath of result.filePaths) {
    try {
      imported.push(await importQuizFromFile(filePath, folderId));
    } catch (err) {
      failures.push({
        name: path.basename(filePath),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const error = importBatchMessage(imported.length, failures);
  if (error) return { ok: false, error, imported, failures };
  return { ok: true, imported };
}

export function registerQuizLibraryHandlers(): void {
  ipcMain.handle(
    IpcChannels.importQuiz,
    (event, folderId: string | null = null) => handleImport(event, folderId),
  );
  ipcMain.handle(IpcChannels.listQuizzes, () => listQuizzes());
  ipcMain.handle(IpcChannels.getQuiz, (_e, id: string) => getQuiz(id));
  ipcMain.handle(IpcChannels.deleteQuiz, (_e, id: string) => deleteQuiz(id));
  ipcMain.handle(
    IpcChannels.moveQuiz,
    (_e, payload: { id: string; folderId: string | null }) =>
      moveQuiz(payload.id, payload.folderId),
  );
  ipcMain.handle(IpcChannels.librarySnapshot, () => librarySnapshot());
  ipcMain.handle(
    IpcChannels.createFolder,
    (_e, input: CreateFolderInput) => createFolder(input),
  );
  ipcMain.handle(
    IpcChannels.updateFolder,
    (_e, input: UpdateFolderInput) => updateFolder(input),
  );
  ipcMain.handle(
    IpcChannels.deleteFolder,
    (_e, payload: { id: string; recursive?: boolean }) =>
      deleteFolder(payload.id, { recursive: payload.recursive }),
  );
}
