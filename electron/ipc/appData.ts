import { ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import { eraseAppData } from "../lib/eraseAppData";

export function registerAppDataHandlers(): void {
  ipcMain.handle(IpcChannels.deleteAllAppData, () => eraseAppData());
}
