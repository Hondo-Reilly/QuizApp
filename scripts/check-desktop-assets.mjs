import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { checkHtmlAssets } from "./check-html-assets.mjs";

const dist = path.resolve("dist");

for (const page of ["index.html", "mobile.html"]) {
  const html = await readFile(path.join(dist, page), "utf8");
  await checkHtmlAssets(html, page, async (relative) => {
    try {
      await access(path.join(dist, relative));
      return true;
    } catch {
      return false;
    }
  });
}

console.log("Desktop HTML asset paths are relative and present.");
