#!/usr/bin/env node
/**
 * Simplify flashcard JSON files in the flashcards/ folder.
 *
 * For each *.json file, replaces the entire contents with an array of
 * { term, definition } objects (everything else - _id, createdAt, bookId,
 * termId, chapterId, etc. - is stripped).
 *
 * Usage:
 *   node scripts/simplify-flashcards.mjs              # rewrites flashcards/*.json in place
 *   node scripts/simplify-flashcards.mjs path/to/dir  # operates on a different directory
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const targetDir = resolve(
  projectRoot,
  process.argv[2] ?? "flashcards",
);

function isJsonFile(name) {
  return name.toLowerCase().endsWith(".json");
}

function simplifyEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const term = typeof entry.term === "string" ? entry.term.trim() : "";
  const definition =
    typeof entry.definition === "string" ? entry.definition.trim() : "";
  if (!term && !definition) return null;
  return { term, definition };
}

function simplifyFile(absPath) {
  const raw = readFileSync(absPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("expected the top-level JSON to be an array");
  }
  const simplified = data.map(simplifyEntry).filter(Boolean);
  writeFileSync(absPath, JSON.stringify(simplified, null, 2) + "\n", "utf-8");
  return { before: data.length, after: simplified.length };
}

function main() {
  let entries;
  try {
    entries = readdirSync(targetDir);
  } catch (err) {
    console.error(`Cannot read directory ${targetDir}: ${err.message}`);
    process.exit(1);
  }

  const files = entries
    .filter(isJsonFile)
    .map((name) => join(targetDir, name))
    .filter((p) => statSync(p).isFile());

  if (files.length === 0) {
    console.log(`No JSON files found in ${targetDir}`);
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  for (const file of files) {
    try {
      const { before, after } = simplifyFile(file);
      totalBefore += before;
      totalAfter += after;
      console.log(`${file}: ${before} -> ${after} entries`);
    } catch (err) {
      console.error(`Failed on ${file}: ${err.message}`);
    }
  }
  console.log(`\nDone. ${files.length} file(s), ${totalAfter}/${totalBefore} entries kept.`);
}

main();
