import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import asar from "@electron/asar";
import { checkHtmlAssets } from "./check-html-assets.mjs";

const root = process.cwd();
const expected = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const archive = path.join(root, "release/mac-arm64/QuizApp.app/Contents/Resources/app.asar");
const diskImage = path.join(root, `release/QuizApp-${expected.version}-arm64.dmg`);

if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== `v${expected.version}`) {
  throw new Error(`Release tag ${process.env.GITHUB_REF_NAME} does not match ${expected.version}`);
}

function readPacked(file) {
  return asar.extractFile(archive, file).toString();
}

const packed = JSON.parse(readPacked("package.json"));
if (packed.version !== expected.version) {
  throw new Error(`Packaged version ${packed.version} does not match ${expected.version}`);
}

readPacked(packed.main);
readPacked("dist-electron/preload.js");

for (const page of ["index.html", "mobile.html"]) {
  const html = readPacked(`dist/${page}`);
  await checkHtmlAssets(html, page, (relative) => {
    try {
      readPacked(`dist/${relative}`);
      return true;
    } catch {
      return false;
    }
  });
}

const image = await stat(diskImage);
if (!image.isFile() || image.size === 0) {
  throw new Error(`Missing or empty installer: ${diskImage}`);
}

console.log(`Packaged QuizApp ${expected.version} has its entry points and assets.`);
