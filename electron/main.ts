import { app, BrowserWindow, nativeImage } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";

const DOCK_ICON = path.join(
  "Quiz App.icon",
  "Assets",
  "dock.png",
);

function applyDockIcon(): void {
  if (process.platform !== "darwin" || !app.dock) return;
  const candidates = [
    path.join(process.cwd(), DOCK_ICON),
    path.join(app.getAppPath(), DOCK_ICON),
  ];
  const iconPath = candidates.find((candidate) => existsSync(candidate));
  if (!iconPath) return;
  const image = nativeImage.createFromPath(iconPath);
  if (!image.isEmpty()) app.dock.setIcon(image);
}

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: "#f8fafc",
    title: "QuizApp",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  applyDockIcon();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
