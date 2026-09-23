import { app, net, shell } from "electron";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { UpdateCheck, UpdateProgress } from "../../shared/types";

const LATEST_RELEASE =
  "https://api.github.com/repos/Hondo-Reilly/QuizApp/releases/latest";

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name?: string;
  body?: string | null;
  assets?: GithubAsset[];
}

function parseVersion(value: string): [number, number, number] | null {
  const match = value.trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isNewer(latest: string, current: string): boolean {
  const next = parseVersion(latest);
  const installed = parseVersion(current);
  if (!next || !installed) return false;
  for (let i = 0; i < 3; i++) {
    if (next[i] !== installed[i]) return next[i] > installed[i];
  }
  return false;
}

const SIMULATED_NOTES = `This is a simulated update for local development.

- The download button opens the DMG already in the release folder
- Nothing is published to GitHub`;

export function simulatedUpdateEnabled(): boolean {
  return !app.isPackaged && process.env.QUIZAPP_SIMULATE_UPDATE === "1";
}

function simulatedUpdate(currentVersion: string): UpdateCheck {
  const parsed = parseVersion(currentVersion) ?? [0, 1, 0];
  return {
    updateAvailable: true,
    currentVersion,
    latestVersion: `${parsed[0]}.${parsed[1]}.${parsed[2] + 1}`,
    downloadUrl: "simulate://local",
    releaseNotes: SIMULATED_NOTES,
  };
}

function none(currentVersion: string): UpdateCheck {
  return {
    updateAvailable: false,
    currentVersion,
    latestVersion: null,
    downloadUrl: null,
    releaseNotes: null,
  };
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  const currentVersion = app.getVersion();
  if (simulatedUpdateEnabled()) return simulatedUpdate(currentVersion);
  try {
    const response = await net.fetch(LATEST_RELEASE, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "QuizApp",
      },
    });
    if (!response.ok) return none(currentVersion);
    const body = (await response.json()) as GithubRelease;
    const latestVersion = body.tag_name?.replace(/^v/, "") ?? null;
    const releaseNotes = body.body?.trim() || null;
    const asset = body.assets?.find((item) => item.name.endsWith("-arm64.dmg"));
    if (!latestVersion || !asset?.browser_download_url) {
      return { ...none(currentVersion), latestVersion, releaseNotes };
    }
    return {
      updateAvailable: isNewer(latestVersion, currentVersion),
      currentVersion,
      latestVersion,
      downloadUrl: asset.browser_download_url,
      releaseNotes,
    };
  } catch {
    return none(currentVersion);
  }
}

type ProgressListener = (progress: UpdateProgress) => void;

function reportProgress(
  onProgress: ProgressListener,
  received: number,
  total: number | null,
): void {
  const percent =
    total && total > 0
      ? Math.min(100, Math.round((received / total) * 100))
      : null;
  onProgress({ received, total, percent });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openInstaller(dest: string): Promise<void> {
  const error = await shell.openPath(dest);
  if (error) throw new Error(error);
  setImmediate(() => {
    app.quit();
  });
}

async function playSimulatedProgress(
  total: number,
  onProgress: ProgressListener,
): Promise<void> {
  const steps = 25;
  for (let step = 0; step <= steps; step++) {
    reportProgress(onProgress, Math.round((total * step) / steps), total);
    if (step < steps) await delay(50);
  }
  await delay(250);
}

async function downloadToFile(
  response: Response,
  dest: string,
  onProgress: ProgressListener,
): Promise<void> {
  const lengthHeader = response.headers.get("content-length");
  const parsedLength = lengthHeader ? Number(lengthHeader) : NaN;
  const total = Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : null;
  const body = response.body;
  if (!body) throw new Error("Download failed");

  const file = createWriteStream(dest);
  const reader = body.getReader();
  let received = 0;
  let lastPercent = -1;
  let lastReportAt = 0;
  reportProgress(onProgress, 0, total);

  const fail = async (error: unknown) => {
    reader.cancel().catch(() => undefined);
    file.destroy();
    await fs.unlink(dest).catch(() => undefined);
    throw error;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      received += value.byteLength;
      const buffered = file.write(Buffer.from(value));
      if (!buffered) {
        await new Promise<void>((resolve, reject) => {
          file.once("drain", () => resolve());
          file.once("error", reject);
        });
      }
      const percent =
        total && total > 0
          ? Math.min(100, Math.round((received / total) * 100))
          : null;
      const now = Date.now();
      const percentChanged = percent !== lastPercent;
      const due = now - lastReportAt >= 100;
      if (percentChanged || (percent == null && due)) {
        lastPercent = percent ?? lastPercent;
        lastReportAt = now;
        reportProgress(onProgress, received, total);
      }
    }
    await new Promise<void>((resolve, reject) => {
      file.once("error", reject);
      file.end(() => resolve());
    });
    reportProgress(onProgress, received, total);
  } catch (error) {
    await fail(error);
  }
}

export async function downloadLatestUpdate(
  onProgress: ProgressListener = () => undefined,
): Promise<void> {
  const check = await checkForUpdate();
  if (!check.updateAvailable || !check.downloadUrl) {
    throw new Error("No update available");
  }
  if (check.downloadUrl === "simulate://local") {
    const dest = path.join(
      process.cwd(),
      "release",
      `QuizApp-${check.currentVersion}-arm64.dmg`,
    );
    let total = 0;
    try {
      total = (await fs.stat(dest)).size;
    } catch {
      throw new Error(
        "Simulated update. Build a DMG with npm run build:mac to open an installer.",
      );
    }
    await playSimulatedProgress(total, onProgress);
    await openInstaller(dest);
    return;
  }
  const response = await net.fetch(check.downloadUrl, {
    headers: { "User-Agent": "QuizApp" },
  });
  if (!response.ok) throw new Error("Download failed");
  const filename =
    new URL(check.downloadUrl).pathname.split("/").pop() || "QuizApp-update.dmg";
  const dest = path.join(app.getPath("temp"), filename);
  await downloadToFile(response, dest, onProgress);
  await openInstaller(dest);
}
