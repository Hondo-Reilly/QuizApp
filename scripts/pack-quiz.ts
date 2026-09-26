// Packs a folder containing quiz.json and images/ into a .quiz file:
//   npm run pack-quiz -- <folder> [output.quiz]
import fs from "node:fs/promises";
import path from "node:path";
import { imageRefs } from "../shared/quizContent";
import { readQuizPackage, writeQuizPackage } from "../shared/quizPackage";
import { parseQuiz } from "../shared/schema";
import { slugifyTitle } from "../shared/storageId";

async function main(): Promise<void> {
  const [folderArg, outArg] = process.argv.slice(2).filter((arg) => arg !== "--");
  if (!folderArg) {
    console.error("Usage: npm run pack-quiz -- <folder> [output.quiz]");
    process.exit(1);
  }
  const folder = path.resolve(folderArg);
  const quiz = parseQuiz(JSON.parse(await fs.readFile(path.join(folder, "quiz.json"), "utf-8")));

  const assets = new Map<string, Uint8Array>();
  for (const ref of imageRefs(quiz)) {
    const file = path.join(folder, ...ref.split("/"));
    assets.set(ref, new Uint8Array(await fs.readFile(file)));
  }

  const bytes = writeQuizPackage(quiz, assets);
  // Read it back with the same checks the app runs on import.
  readQuizPackage(bytes);

  const out = path.resolve(outArg ?? `${slugifyTitle(quiz.title)}.quiz`);
  await fs.writeFile(out, bytes);
  console.log(
    `Wrote ${out} (${quiz.questions.length} questions, ${assets.size} images, ${bytes.length} bytes)`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
