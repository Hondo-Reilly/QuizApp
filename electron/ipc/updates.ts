import { ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import { checkForUpdate, downloadLatestUpdate } from "../lib/updates";

export function registerUpdateHandlers(): void {
  ipcMain.handle(IpcChannels.checkForUpdate, () => checkForUpdate());
  ipcMain.handle(IpcChannels.downloadUpdate, () => downloadLatestUpdate());
}
