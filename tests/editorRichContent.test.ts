import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { cellsFromSpreadsheet, formatTable, parseTable, tableAt } from "@/lib/markdownTable";
import { countDollarFields, escapeDollars, mapQuizText } from "@shared/quizEdits";
import { checkedUploads } from "@shared/quizSave";
import type { Quiz } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-rich-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getAppPath: () => userData },
  BrowserWindow: { getAllWindows: () => [] },
}));

const store = await import("../electron/lib/fileStore");

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function withImage(src: string): Quiz {
  const quiz: Quiz = { ...makeQuiz(), schemaVersion: 2 };
  quiz.questions[0] = { ...quiz.questions[0], image: { src, alt: "A figure" } };
  return quiz;
}

describe("markdown tables", () => {
  it("formats cells as a table and reads them back", () => {
    const cells = [
      ["Property", "Value"],
      ["Diameter $D$", "12.7 mm"],
      ["Pipe | char", ""],
    ];
    const text = formatTable(cells);
    expect(text).toBe(
      "| Property | Value |\n| --- | --- |\n| Diameter $D$ | 12.7 mm |\n| Pipe \\| char |  |",
    );
    expect(parseTable(text)).toEqual(cells);
    expect(parseTable("not | a table")).toBeNull();
  });

  it("finds the table around the caret, and nothing elsewhere", () => {
    const table = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const text = `Intro line\n\n${table}\n\nAfter`;
    const found = tableAt(text, text.indexOf("| 1"));
    expect(found).toMatchObject({ cells: [["A", "B"], ["1", "2"]] });
    expect(text.slice(found!.start, found!.end)).toBe(table);
    expect(tableAt(text, 2)).toBeNull();
  });

  it("turns cells pasted from a spreadsheet into rows", () => {
    expect(cellsFromSpreadsheet("Name\tAge\nAda\t36\nAlan\n")).toEqual([
      ["Name", "Age"],
      ["Ada", "36"],
      ["Alan", ""],
    ]);
    expect(cellsFromSpreadsheet("plain text\nwith lines")).toBeNull();
  });
});

describe("dollar signs when switching to Markdown", () => {
  it("counts and escapes every formatted field, leaving code alone", () => {
    const quiz: Quiz = {
      schemaVersion: 2,
      id: "d",
      title: "Prices",
      scenarios: [{ id: "s1", text: "Costs $5 to $6" }],
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          prompt: "Pay $3?",
          choices: [
            { id: "a", text: "$1" },
            { id: "b", text: "Already \\$2" },
          ],
          answer: "a",
        },
        { id: "q2", type: "long_answer", prompt: "Code", code: true, sampleAnswer: "echo $HOME" },
      ],
    };
    expect(countDollarFields(quiz)).toBe(3);
    const escaped = escapeDollars(quiz);
    expect(escaped.scenarios?.[0].text).toBe("Costs \\$5 to \\$6");
    const mc = escaped.questions[0];
    if (mc.type !== "multiple_choice") throw new Error("Bad fixture");
    expect(mc.prompt).toBe("Pay \\$3?");
    expect(mc.choices.map((choice) => choice.text)).toEqual(["\\$1", "Already \\$2"]);
    const code = escaped.questions[1];
    expect(code.type === "long_answer" && code.sampleAnswer).toBe("echo $HOME");
    expect(countDollarFields(escaped)).toBe(0);
  });

  it("reaches matching items and rubric points", () => {
    const quiz: Quiz = {
      schemaVersion: 2,
      id: "m",
      title: "T",
      questions: [
        { id: "q1", type: "matching", prompt: "p", choices: [{ id: "a", text: "c" }, { id: "b", text: "d" }], items: [{ id: "1", text: "i", answer: "a" }] },
        { id: "q2", type: "short_answer", prompt: "p", rubric: ["r"] },
      ],
    };
    const seen: string[] = [];
    mapQuizText(quiz, (text) => {
      seen.push(text);
      return text;
    });
    expect(seen).toEqual(expect.arrayContaining(["c", "d", "i", "r"]));
  });
});

describe("image uploads", () => {
  it("keeps only valid images the quiz uses", () => {
    const quiz = withImage("images/fig.png");
    expect(
      checkedUploads(
        [
          { path: "images/fig.png", data: PNG },
          { path: "images/unused.png", data: PNG },
        ],
        quiz,
      ),
    ).toEqual([{ path: "images/fig.png", data: PNG }]);
    expect(checkedUploads(undefined, quiz)).toEqual([]);
  });

  it("refuses files that aren't the image they claim to be", () => {
    expect(() => checkedUploads([{ path: "images/fig.png", data: new Uint8Array([1, 2, 3]) }], withImage("images/fig.png"))).toThrow(
      /not a valid image/,
    );
    expect(() => checkedUploads([{ path: "images/fig.png", data: "nope" }], withImage("images/fig.png"))).toThrow(/not valid/);
    expect(() => checkedUploads("nope", withImage("images/fig.png"))).toThrow(/not valid/);
  });

  it("stores new images with a created quiz and with a save", async () => {
    const created = await store.createQuiz({ ...withImage("images/fig.png"), title: "Pictures" }, null, [
      { path: "images/fig.png", data: PNG },
    ]);
    const stored = path.join(userData, "quizzes", `${created.id}.assets`, "images", "fig.png");
    expect(new Uint8Array(await fs.readFile(stored))).toEqual(PNG);

    const quiz = (await store.getQuiz(created.id))!;
    const edited = structuredClone(quiz);
    edited.questions[1] = { ...edited.questions[1], image: { src: "images/second.png" } };
    await expect(store.saveQuiz(edited)).rejects.toThrow(/isn't stored/);
    await store.saveQuiz(edited, [{ path: "images/second.png", data: PNG }]);
    expect((await store.getQuiz(created.id))?.questions[1].image?.src).toBe("images/second.png");
    // The first image stays stored even though nothing else changed it.
    expect(new Uint8Array(await fs.readFile(stored))).toEqual(PNG);
  });
});
