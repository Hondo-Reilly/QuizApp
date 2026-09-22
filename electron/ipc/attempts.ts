import { ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import type { SaveAttemptInput } from "../../shared/types";
import {
  deleteAttempts,
  getAttempt,
  listAttempts,
  saveAttempt,
} from "../lib/attemptStore";

export function registerAttemptHandlers(): void {
  ipcMain.handle(IpcChannels.saveAttempt, (_e, input: SaveAttemptInput) =>
    saveAttempt(input),
  );
  ipcMain.handle(IpcChannels.listAttempts, (_e, quizId: string) =>
    listAttempts(quizId),
  );
  ipcMain.handle(IpcChannels.getAttempt, (_e, id: string) => getAttempt(id));
  ipcMain.handle(IpcChannels.deleteAttempts, (_e, ids: string[]) =>
    deleteAttempts(ids),
  );
}
