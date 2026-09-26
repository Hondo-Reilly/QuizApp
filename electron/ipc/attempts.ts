import { ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import type { AttemptScore, SaveAttemptInput } from "../../shared/types";
import {
  deleteAttempts,
  getAttempt,
  listAttempts,
  saveAttempt,
  setAttemptFlags,
  setAttemptSelfMarks,
} from "../lib/attemptStore";

export function registerAttemptHandlers(): void {
  ipcMain.handle(IpcChannels.saveAttempt, (_e, input: SaveAttemptInput) =>
    saveAttempt(input),
  );
  ipcMain.handle(IpcChannels.listAttempts, (_e, quizId: string) =>
    listAttempts(quizId),
  );
  ipcMain.handle(IpcChannels.getAttempt, (_e, id: string) => getAttempt(id));
  ipcMain.handle(
    IpcChannels.setAttemptFlags,
    (_e, payload: { id: string; flagged: string[] }) =>
      setAttemptFlags(payload.id, payload.flagged),
  );
  ipcMain.handle(
    IpcChannels.setAttemptSelfMarks,
    (_e, payload: { id: string; selfMarks: Record<string, unknown>; score: AttemptScore }) =>
      setAttemptSelfMarks(payload.id, payload.selfMarks, payload.score),
  );
  ipcMain.handle(IpcChannels.deleteAttempts, (_e, ids: string[]) =>
    deleteAttempts(ids),
  );
}
