import { BrowserWindow, ipcMain, nativeTheme } from "electron";
import { IpcChannels } from "../../shared/ipcChannels";

const WINDOW_BACKGROUND = {
  light: "#f8fafc",
  dark: "#0a0a0a",
} as const;

export function registerThemeHandlers(): void {
  ipcMain.on(IpcChannels.setTheme, (event, theme: unknown) => {
    if (theme !== "light" && theme !== "dark") return;
    nativeTheme.themeSource = theme;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.setBackgroundColor(WINDOW_BACKGROUND[theme]);
    if (process.platform === "darwin") win.setWindowButtonVisibility(true);
  });
}
