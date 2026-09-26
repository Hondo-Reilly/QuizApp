import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import {
  imageRefs,
  isImagePath,
  isPackageImagePath,
  isSvgPath,
  renameImageRefs,
} from "./quizContent";
import { parseQuiz, type ParsedQuizInput } from "./schema";

export const QUIZ_PACKAGE_EXTENSION = ".quiz";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 2000;
const QUIZ_JSON = "quiz.json";

export interface QuizPackage {
  quiz: ParsedQuizInput;
  /** Referenced images keyed by their path, e.g. "images/a.png". */
  assets: Map<string, Uint8Array>;
}

/** A .quiz package is a zip file, which starts with "PK\x03\x04". */
export function isZipData(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** Checks the file's own signature so a renamed file cannot pass as an image. */
export function looksLikeImage(path: string, bytes: Uint8Array): boolean {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "gif":
      return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
    case "webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
      );
    case "svg": {
      const head = strFromU8(bytes.subarray(0, 4096));
      return /<svg[\s>]/i.test(head);
    }
    default:
      return false;
  }
}

function ignoredEntry(name: string): boolean {
  return (
    name.endsWith("/") ||
    name.startsWith("__MACOSX/") ||
    name.split("/").some((part) => part === ".DS_Store")
  );
}

/**
 * Finds where quiz.json lives. Finder's "Compress" wraps everything in one
 * folder, so quiz.json may sit at the root or inside a single top folder.
 */
function packageRoot(names: string[]): string {
  if (names.includes(QUIZ_JSON)) return "";
  const nested = names.filter((name) => /^[^/]+\/quiz\.json$/.test(name));
  if (nested.length === 1) return nested[0].slice(0, -QUIZ_JSON.length);
  throw new Error("The package has no quiz.json at its top level.");
}

export function readQuizPackage(bytes: Uint8Array): QuizPackage {
  if (!isZipData(bytes)) throw new Error("That file is not a .quiz package.");

  const sizes = new Map<string, number>();
  unzipSync(bytes, {
    filter(file) {
      if (!ignoredEntry(file.name)) sizes.set(file.name, file.originalSize);
      return false;
    },
  });
  if (sizes.size > MAX_ENTRIES) throw new Error("The package has too many files.");

  const root = packageRoot([...sizes.keys()]);
  const wanted = new Set<string>();
  let total = 0;
  for (const [name, size] of sizes) {
    if (!name.startsWith(root)) continue;
    const rel = name.slice(root.length);
    if (rel !== QUIZ_JSON && !isPackageImagePath(rel)) continue;
    if (rel !== QUIZ_JSON && size > MAX_IMAGE_BYTES) {
      throw new Error(`${rel} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
    }
    total += size;
    if (total > MAX_PACKAGE_BYTES) {
      throw new Error(
        `The package is larger than ${MAX_PACKAGE_BYTES / 1024 / 1024} MB when unzipped.`,
      );
    }
    wanted.add(name);
  }

  const files = unzipSync(bytes, { filter: (file) => wanted.has(file.name) });
  const quizBytes = files[`${root}${QUIZ_JSON}`];

  let data: unknown;
  try {
    data = JSON.parse(strFromU8(quizBytes));
  } catch {
    throw new Error("quiz.json is not valid JSON.");
  }
  const quiz = parseQuiz(data);

  const assets = new Map<string, Uint8Array>();
  for (const ref of imageRefs(quiz)) {
    const image = files[`${root}${ref}`];
    if (!image) throw new Error(`The package is missing ${ref}.`);
    if (image.length > MAX_IMAGE_BYTES) {
      throw new Error(`${ref} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
    }
    if (!looksLikeImage(ref, image)) {
      throw new Error(`${ref} is not a valid image of its file type.`);
    }
    assets.set(ref, image);
  }
  return { quiz, assets };
}

/** Parses a plain .json quiz, which cannot carry images. */
export function readQuizJson(text: string): ParsedQuizInput {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const quiz = parseQuiz(data);
  if (imageRefs(quiz).length > 0) {
    throw new Error(
      "This quiz uses images. Import it as a .quiz package that contains them.",
    );
  }
  return quiz;
}

/** Reads either a .quiz package or a plain JSON quiz from raw file bytes. */
export function readQuizFile(bytes: Uint8Array): QuizPackage {
  if (isZipData(bytes)) return readQuizPackage(bytes);
  return { quiz: readQuizJson(strFromU8(bytes)), assets: new Map() };
}

export function writeQuizPackage(
  quiz: unknown,
  assets: ReadonlyMap<string, Uint8Array>,
): Uint8Array {
  const files: Zippable = {
    [QUIZ_JSON]: strToU8(`${JSON.stringify(quiz, null, 2)}\n`),
  };
  for (const [path, data] of assets) {
    if (!isPackageImagePath(path)) throw new Error(`${path} is not an images/ path.`);
    // Images are already compressed, so store them as-is.
    files[path] = [data, { level: 0 }];
  }
  return zipSync(files, { level: 6 });
}

/** Renders SVG source to PNG bytes. Each platform supplies its own. */
export type SvgRasterizer = (svg: string) => Promise<Uint8Array>;

function pngPathFor(svgPath: string, taken: Set<string>): string {
  const stem = svgPath.replace(/\.svg$/i, "");
  let candidate = `${stem}.png`;
  for (let n = 1; taken.has(candidate); n += 1) {
    candidate = `${stem}-svg${n > 1 ? `-${n}` : ""}.png`;
  }
  return candidate;
}

/**
 * Replaces every SVG in a package with a PNG rendering of it and points the
 * quiz at the PNGs, so stored quizzes only ever contain raster images.
 */
export async function convertSvgImages(
  pkg: QuizPackage,
  rasterize: SvgRasterizer,
): Promise<QuizPackage> {
  const svgPaths = [...pkg.assets.keys()].filter(isSvgPath);
  if (svgPaths.length === 0) return pkg;

  const assets = new Map([...pkg.assets].filter(([path]) => !isSvgPath(path)));
  const taken = new Set(assets.keys());
  const renames = new Map<string, string>();
  for (const svgPath of svgPaths) {
    let png: Uint8Array;
    try {
      png = await rasterize(strFromU8(pkg.assets.get(svgPath)!));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Could not convert ${svgPath} to PNG: ${reason}`);
    }
    const pngPath = pngPathFor(svgPath, taken);
    if (!looksLikeImage(pngPath, png)) {
      throw new Error(`Could not convert ${svgPath} to PNG.`);
    }
    taken.add(pngPath);
    renames.set(svgPath, pngPath);
    assets.set(pngPath, png);
  }

  const quiz = renameImageRefs(pkg.quiz, renames);
  if (imageRefs(quiz).some((ref) => !isImagePath(ref))) {
    throw new Error("Some SVG references could not be converted.");
  }
  return { quiz, assets };
}
