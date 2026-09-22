import { BrowserWindow, ipcMain } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";
import { saveHtmlAsPdf } from "../lib/savePdf";

export function registerPdfHandlers(): void {
  ipcMain.handle(
    IpcChannels.saveQuizPdf,
    (event, payload: { html: string; filename: string }) => {
      const parent = BrowserWindow.fromWebContents(event.sender);
      return saveHtmlAsPdf(payload.html, payload.filename, parent);
    },
  );
}
