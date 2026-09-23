import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import fs from "node:fs/promises";
import { attemptsFile, quizzesDir } from "./paths";

async function deleteAllAppData(): Promise<void> {
  const parent =
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const options = {
    type: "warning" as const,
    buttons: ["Cancel", "Delete All App Data"],
    defaultId: 0,
    cancelId: 0,
    message: "Delete all app data?",
    detail:
      "Imported quizzes, quiz attempts, and saved settings will be removed. This cannot be undone.",
  };
  const { response } = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  if (response !== 1) return;

  await fs.rm(quizzesDir(), { recursive: true, force: true });
  await fs.rm(attemptsFile(), { force: true });

  for (const win of BrowserWindow.getAllWindows()) {
    await win.webContents.session.clearStorageData();
    win.webContents.reload();
  }
}

const isDev = !!process.env.VITE_DEV_SERVER_URL;

export function installAppDataMenu(): void {
  if (process.platform !== "darwin") return;

  const viewSubmenu: Electron.MenuItemConstructorOptions[] = [
    { role: "reload" },
    { role: "forceReload" },
    { role: "toggleDevTools" },
    { type: "separator" },
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ];

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          {
            label: "Delete All App Data…",
            click: () => {
              void deleteAllAppData();
            },
          },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "File",
        submenu: [{ role: "close" }],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "pasteAndMatchStyle" },
          { role: "delete" },
          { role: "selectAll" },
          { type: "separator" },
          {
            label: "Speech",
            submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
          },
        ],
      },
      {
        label: "View",
        submenu: isDev
          ? viewSubmenu
          : viewSubmenu.filter((item) => item.role !== "toggleDevTools"),
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          { type: "separator" },
          { role: "front" },
          { type: "separator" },
          { role: "window" },
        ],
      },
      {
        role: "help",
        submenu: [
          {
            label: "Learn More",
            click: () => {
              void shell.openExternal("https://electronjs.org");
            },
          },
        ],
      },
    ]),
  );
}
