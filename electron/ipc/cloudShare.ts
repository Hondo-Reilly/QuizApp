import { BrowserWindow, dialog, ipcMain, net } from "electron";
import fs from "node:fs/promises";
import { createCloudShare, type CloudShareStore } from "../../shared/cloudShare";
import { IpcChannels } from "../../shared/ipcChannels";
import type { QuizMetadata } from "../../shared/types";
import {
  exportQuizPackage,
  getQuizMetadata,
  importQuizBytes,
  listQuizzes,
  replaceQuizBytes,
  updateCloudFields,
} from "../lib/fileStore";

const store: CloudShareStore = {
  getMeta: getQuizMetadata,
  listMeta: listQuizzes,
  exportPackage: exportQuizPackage,
  updateCloudFields,
  importBytes: (bytes, folderId, _sourceName, cloudSource) =>
    importQuizBytes(bytes, folderId, cloudSource),
  replaceBytes: (id, bytes, _sourceName, cloudSource) =>
    replaceQuizBytes(id, bytes, cloudSource),
};

// The main process sends these requests, so the file:// renderer needs no CORS.
const cloud = createCloudShare(store, (url, init) => net.fetch(url, init));

async function handleReplaceFromFile(
  event: Electron.IpcMainInvokeEvent,
  id: string,
): Promise<QuizMetadata | null> {
  const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const result = await dialog.showOpenDialog(window!, {
    title: "Replace quiz from file",
    properties: ["openFile"],
    filters: [{ name: "Quiz", extensions: ["quiz", "json"] }],
  });
  const file = result.filePaths[0];
  if (result.canceled || !file) return null;
  return replaceQuizBytes(id, new Uint8Array(await fs.readFile(file)));
}

export function registerCloudShareHandlers(): void {
  ipcMain.handle(IpcChannels.replaceQuizFromFile, (event, id: string) =>
    handleReplaceFromFile(event, id),
  );
  ipcMain.handle(IpcChannels.shareQuiz, (_e, id: string) => cloud.shareQuiz(id));
  ipcMain.handle(IpcChannels.publishQuizUpdate, (_e, id: string) =>
    cloud.publishQuizUpdate(id),
  );
  ipcMain.handle(IpcChannels.extendQuizShare, (_e, id: string) => cloud.extendQuizShare(id));
  ipcMain.handle(IpcChannels.unshareQuiz, (_e, id: string) => cloud.unshareQuiz(id));
  ipcMain.handle(IpcChannels.previewSharedQuiz, (_e, code: string) =>
    cloud.previewSharedQuiz(code),
  );
  ipcMain.handle(
    IpcChannels.importSharedQuiz,
    (_e, payload: { code: string; folderId: string | null }) =>
      cloud.importSharedQuiz(payload.code, payload.folderId),
  );
  ipcMain.handle(IpcChannels.checkSharedQuizzes, () => cloud.checkSharedQuizzes());
  ipcMain.handle(IpcChannels.updateSharedQuiz, (_e, id: string) => cloud.updateSharedQuiz(id));
}
