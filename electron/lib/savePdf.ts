import { BrowserWindow, dialog } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function saveHtmlAsPdf(
  html: string,
  defaultName: string,
  parent: BrowserWindow | null,
): Promise<boolean> {
  const tmp = path.join(os.tmpdir(), `quiz-${Date.now()}.html`);
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true },
  });
  try {
    await fs.writeFile(tmp, html, "utf-8");
    await win.loadFile(tmp);
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "Letter",
      margins: { marginType: "default" },
    });
    const options = {
      title: "Save quiz as PDF",
      defaultPath: defaultName.endsWith(".pdf") ? defaultName : `${defaultName}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    };
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return false;
    await fs.writeFile(result.filePath, pdf);
    return true;
  } finally {
    win.destroy();
    await fs.unlink(tmp).catch(() => undefined);
  }
}
