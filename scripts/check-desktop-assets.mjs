import { readFile, access } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");

for (const page of ["index.html", "mobile.html"]) {
  const html = await readFile(path.join(dist, page), "utf8");
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|data:|#)/.test(reference));

  for (const reference of references) {
    if (reference.startsWith("/")) {
      throw new Error(`${page} has a root-absolute asset URL: ${reference}`);
    }
    const asset = path.resolve(dist, reference.split(/[?#]/, 1)[0]);
    if (!asset.startsWith(`${dist}${path.sep}`)) {
      throw new Error(`${page} has an asset URL outside dist: ${reference}`);
    }
    await access(asset).catch(() => {
      throw new Error(`${page} references a missing asset: ${reference}`);
    });
  }
}

console.log("Desktop HTML asset paths are relative and present.");
