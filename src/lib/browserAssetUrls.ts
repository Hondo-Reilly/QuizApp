import { readBrowserAssets } from "./browserLibrary";

// Object URLs for stored package images, kept until the quiz or all data is deleted.
const cache = new Map<string, Map<string, string>>();

export async function browserAssetUrls(
  quizId: string,
  paths: readonly string[],
): Promise<Record<string, string>> {
  let urls = cache.get(quizId);
  if (!urls) {
    urls = new Map();
    cache.set(quizId, urls);
  }
  const missing = paths.filter((path) => !urls!.has(path));
  if (missing.length > 0) {
    const stored = await readBrowserAssets(quizId, missing);
    for (const [path, asset] of stored) {
      const blob = new Blob([asset.data as BlobPart], { type: asset.type });
      urls.set(path, URL.createObjectURL(blob));
    }
  }
  const out: Record<string, string> = {};
  for (const path of paths) {
    const url = urls.get(path);
    if (url) out[path] = url;
  }
  return out;
}

export function forgetBrowserAssetUrls(quizId?: string): void {
  const ids = quizId === undefined ? [...cache.keys()] : [quizId];
  for (const id of ids) {
    for (const url of cache.get(id)?.values() ?? []) URL.revokeObjectURL(url);
    cache.delete(id);
  }
}
