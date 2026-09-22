import { app, net, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { UpdateCheck } from "../../shared/types";

const LATEST_RELEASE =
  "https://api.github.com/repos/Hondo-Reilly/QuizApp/releases/latest";

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name?: string;
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

function none(currentVersion: string): UpdateCheck {
  return {
    updateAvailable: false,
    currentVersion,
    latestVersion: null,
    downloadUrl: null,
  };
}

export async function checkForUpdate(): Promise<UpdateCheck> {
  const currentVersion = app.getVersion();
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
    const asset = body.assets?.find((item) => item.name.endsWith("-arm64.dmg"));
    if (!latestVersion || !asset?.browser_download_url) {
      return { ...none(currentVersion), latestVersion };
    }
    return {
      updateAvailable: isNewer(latestVersion, currentVersion),
      currentVersion,
      latestVersion,
      downloadUrl: asset.browser_download_url,
    };
  } catch {
    return none(currentVersion);
  }
}

export async function downloadLatestUpdate(): Promise<void> {
  const check = await checkForUpdate();
  if (!check.updateAvailable || !check.downloadUrl) {
    throw new Error("No update available");
  }
  const response = await net.fetch(check.downloadUrl, {
    headers: { "User-Agent": "QuizApp" },
  });
  if (!response.ok) throw new Error("Download failed");
  const filename =
    new URL(check.downloadUrl).pathname.split("/").pop() || "QuizApp-update.dmg";
  const dest = path.join(app.getPath("temp"), filename);
  await fs.writeFile(dest, Buffer.from(await response.arrayBuffer()));
  const error = await shell.openPath(dest);
  if (error) throw new Error(error);
}
