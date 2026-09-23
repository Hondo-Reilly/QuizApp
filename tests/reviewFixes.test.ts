import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readJsonIfPresent, writeJsonAtomic } from "../electron/lib/durableJson";
import { createMutationQueue } from "../electron/lib/mutationQueue";
import { importBatchMessage } from "@shared/importBatch";

describe("desktop mutation queue", () => {
  it("keeps both saves when two writes overlap", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-queue-"));
    const file = path.join(dir, "attempts.json");
    await writeJsonAtomic(file, { attempts: [] as string[] });
    const queue = createMutationQueue();
    const save = (id: string) =>
      queue.enqueue(async () => {
        const current = (await readJsonIfPresent(file)) as { attempts: string[] };
        await new Promise((resolve) => setTimeout(resolve, 15));
        await writeJsonAtomic(file, { attempts: [...current.attempts, id] });
      });

    await Promise.all([save("one"), save("two")]);
    const stored = (await readJsonIfPresent(file)) as { attempts: string[] };
    expect(stored.attempts).toEqual(["one", "two"]);
  });
});

describe("partial quiz import", () => {
  it("keeps the successes in the summary and names each failure", () => {
    expect(
      importBatchMessage(2, [{ name: "broken.json", error: "Duplicate question id \"q1\"" }]),
    ).toBe(
      'Imported 2 quizzes. Could not import broken.json: Duplicate question id "q1"',
    );
    expect(importBatchMessage(0, [{ name: "broken.json", error: "Bad file" }])).toBe(
      "Could not import broken.json: Bad file",
    );
    expect(importBatchMessage(1, [])).toBeNull();
  });
});
