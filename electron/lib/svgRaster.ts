import { BrowserWindow, session } from "electron";
import { base64ToBytes, rasterizeSvgInPage } from "../../shared/svgRaster";
import type { SvgRasterizer } from "../../shared/quizPackage";

const PARTITION = "quizapp-svg-convert";
let sessionReady = false;

// The converter window may only load its own blank page and blob: images.
function convertSession(): Electron.Session {
  const convert = session.fromPartition(PARTITION);
  if (!sessionReady) {
    convert.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: !/^(data|blob|about):/i.test(details.url) });
    });
    convert.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    sessionReady = true;
  }
  return convert;
}

/**
 * Runs a batch of SVG conversions in one hidden, sandboxed window, then
 * closes it. The window never shows and has no access to the app's data.
 */
export async function withSvgRasterizer<T>(
  work: (rasterize: SvgRasterizer) => Promise<T>,
): Promise<T> {
  let win: BrowserWindow | null = null;
  const rasterize: SvgRasterizer = async (svg) => {
    if (!win) {
      win = new BrowserWindow({
        show: false,
        width: 400,
        height: 300,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          session: convertSession(),
        },
      });
      await win.loadURL("data:text/html;charset=utf-8,<!doctype html><title>convert</title>");
    }
    const script = `(${rasterizeSvgInPage.toString()})(${JSON.stringify(svg)})`;
    const base64: unknown = await win.webContents.executeJavaScript(script);
    if (typeof base64 !== "string") throw new Error("the converter returned no image");
    return base64ToBytes(base64);
  };
  try {
    return await work(rasterize);
  } finally {
    const opened = win as BrowserWindow | null;
    if (opened && !opened.isDestroyed()) opened.destroy();
  }
}
