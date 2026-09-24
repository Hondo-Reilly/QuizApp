import { BrowserWindow } from "electron";
import fs from "node:fs/promises";
import { enqueueAttemptWrite } from "./attemptStore";
import { enqueueLibraryWrite } from "./fileStore";
import { stopMobileServer } from "./mobileServer";
import { attemptsFile, quizzesDir } from "./paths";

export async function eraseAppData(): Promise<void> {
  await stopMobileServer();
  const attempts = attemptsFile();
  await enqueueAttemptWrite(async () => {
    await fs.rm(attempts, { force: true });
    await fs.rm(`${attempts}.bak`, { force: true });
  });
  await enqueueLibraryWrite(() =>
    fs.rm(quizzesDir(), { recursive: true, force: true }),
  );
  for (const win of BrowserWindow.getAllWindows()) {
    await win.webContents.session.clearStorageData();
  }
}
