import { app, BrowserWindow, Menu, MenuItem, nativeImage } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { simulatedUpdateEnabled } from "./lib/updates";

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

function enableDevTools(win: BrowserWindow): void {
  win.webContents.on("before-input-event", (_event, input) => {
    if (
      input.type === "keyDown" &&
      input.meta &&
      input.alt &&
      input.key.toLowerCase() === "i"
    ) {
      win.webContents.toggleDevTools();
    }
  });

  const menu = Menu.getApplicationMenu();
  const view = menu?.items.find((item) => item.role === "viewMenu");
  if (!view?.submenu) return;
  if (view.submenu.items.some((item) => item.role === "toggleDevTools")) return;
  view.submenu.append(new MenuItem({ type: "separator" }));
  view.submenu.append(new MenuItem({ role: "reload" }));
  view.submenu.append(
    new MenuItem({
      label: "Toggle Developer Tools",
      accelerator: "Alt+Command+I",
      click: () => win.webContents.toggleDevTools(),
    }),
  );
}

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
      devTools: isDev,
    },
  });

  if (isDev) {
    enableDevTools(win);
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  if (simulatedUpdateEnabled()) {
    console.log(
      "Simulating an available update. The download button opens the local DMG.",
    );
  }
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
