import { ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import type { MobilePatch, MobileSessionSeed } from "../../shared/mobile";
import { isMobilePatch } from "../../shared/mobile";
import {
  patchMobileSession,
  startMobileServer,
  stopMobileServer,
} from "../lib/mobileServer";

export function registerMobileHandlers(): void {
  ipcMain.handle(IpcChannels.mobileStart, (_event, seed: MobileSessionSeed) =>
    startMobileServer(seed),
  );
  ipcMain.handle(IpcChannels.mobileStop, () => stopMobileServer());
  ipcMain.handle(IpcChannels.mobilePatch, (_event, patch: MobilePatch) => {
    if (!isMobilePatch(patch)) return null;
    return patchMobileSession(patch);
  });
}
