import path from "node:path";

export async function checkHtmlAssets(html, page, assetExists) {
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|data:|#)/.test(reference));

  for (const reference of references) {
    if (reference.startsWith("/")) {
      throw new Error(`${page} has a root-absolute asset URL: ${reference}`);
    }
    const relative = path.posix.normalize(reference.split(/[?#]/, 1)[0]);
    if (relative === "." || relative === ".." || relative.startsWith("../")) {
      throw new Error(`${page} has an asset URL outside dist: ${reference}`);
    }
    if (!(await assetExists(relative))) {
      throw new Error(`${page} references a missing asset: ${reference}`);
    }
  }
}
