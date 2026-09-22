#!/usr/bin/env node
/**
 * Combine flashcard JSON files into a single text file.
 *
 * Output format (per entry):
 *   term
 *   definition
 *   <blank line>
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const HELP = `Combine flashcard JSON files into a single text file.

Usage:
  node scripts/combine-flashcards.mjs [files...] [options]

Arguments:
  files       Specific files to include, in the order you list them.
              - Bare name (ch1, ch1.json): looked up in --dir.
              - Path (./other/foo.json, /abs/bar.json): used as-is from cwd.
              If no files are listed, every *.json in --dir is included
              in natural alphabetical order (ch2 < ch10).

Options:
  -o, --output <name|path>  Output file. Default: <dir>/combined.txt
                            Bare name -> written into --dir as <name>.txt.
                            Path      -> resolved from cwd.
  -d, --dir <path>          Source directory for bare-name lookups and the
                            default file set. Default: flashcards
  -h, --help                Show this help.

Examples:
  node scripts/combine-flashcards.mjs
    -> flashcards/*.json -> flashcards/combined.txt

  node scripts/combine-flashcards.mjs ch1 ch3 ch5 -o midterm
    -> flashcards/{ch1,ch3,ch5}.json -> flashcards/midterm.txt

  node scripts/combine-flashcards.mjs ch1 ch2 -o ~/Desktop/exam1.txt
    -> flashcards/{ch1,ch2}.json -> ~/Desktop/exam1.txt
`;

const { values, positionals } = parseArgs({
  options: {
    output: { type: "string", short: "o" },
    dir: { type: "string", short: "d" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const inputDir = values.dir
  ? resolve(process.cwd(), values.dir)
  : resolve(projectRoot, "flashcards");

function isJsonFile(name) {
  return name.toLowerCase().endsWith(".json");
}

function looksLikePath(name) {
  return name.includes("/") || isAbsolute(name);
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function resolveInput(name) {
  if (looksLikePath(name)) return resolve(process.cwd(), name);
  const withExt = isJsonFile(name) ? name : `${name}.json`;
  return join(inputDir, withExt);
}

function resolveOutput(name) {
  if (!name) return join(inputDir, "combined.txt");
  if (looksLikePath(name)) return resolve(process.cwd(), name);
  const withExt = name.toLowerCase().endsWith(".txt") ? name : `${name}.txt`;
  return join(inputDir, withExt);
}

function listDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (err) {
    console.error(`Cannot read directory ${dir}: ${err.message}`);
    process.exit(1);
  }
  return entries
    .filter(isJsonFile)
    .sort(naturalSort)
    .map((name) => join(dir, name))
    .filter((p) => statSync(p).isFile());
}

function loadEntries(absPath) {
  const raw = readFileSync(absPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("expected the top-level JSON to be an array");
  }
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const term = typeof entry.term === "string" ? entry.term.trim() : "";
      const definition =
        typeof entry.definition === "string" ? entry.definition.trim() : "";
      if (!term && !definition) return null;
      return { term, definition };
    })
    .filter(Boolean);
}

function main() {
  const outputFile = resolveOutput(values.output);
  const files =
    positionals.length > 0
      ? positionals.map(resolveInput)
      : listDir(inputDir);

  if (files.length === 0) {
    console.log(`No JSON files to combine.`);
    return;
  }

  const parts = [];
  let totalEntries = 0;
  let okFiles = 0;
  let failedFiles = 0;
  for (const file of files) {
    try {
      const entries = loadEntries(file);
      for (const { term, definition } of entries) {
        parts.push(`${term}\n${definition}\n`);
      }
      console.log(`${file}: ${entries.length} entries`);
      totalEntries += entries.length;
      okFiles += 1;
    } catch (err) {
      console.error(`Skipped ${file}: ${err.message}`);
      failedFiles += 1;
    }
  }

  if (okFiles === 0) {
    console.error("\nNothing to write - all input files failed.");
    process.exit(1);
  }

  writeFileSync(outputFile, parts.join("\n"), "utf-8");
  const suffix = failedFiles > 0 ? ` (${failedFiles} skipped)` : "";
  console.log(
    `\nWrote ${totalEntries} entries from ${okFiles} file(s)${suffix} to ${outputFile}`,
  );
}

main();
