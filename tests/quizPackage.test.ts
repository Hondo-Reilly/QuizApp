import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { quizAssetFileInDir, quizAssetsDirInDir } from "../electron/lib/quizPath";
import { parseQuizAssetUrl, quizAssetUrl } from "@shared/quizAssetUrl";
import { imageRefs, isImagePath, isPackageImagePath } from "@shared/quizContent";
import {
  convertSvgImages,
  MAX_IMAGE_BYTES,
  readQuizFile,
  readQuizJson,
  readQuizPackage,
  writeQuizPackage,
} from "@shared/quizPackage";
import { parseQuiz } from "@shared/schema";
import type { Quiz } from "@shared/types";
import { renderMarkdown } from "@/lib/markdown";
import { makeQuiz } from "./fixtures/quiz";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9]);

function makeRichQuiz(): Quiz {
  const quiz = makeQuiz();
  quiz.schemaVersion = 2;
  quiz.textFormat = "markdown";
  quiz.questions[0].image = { src: "images/diagram.png", alt: "Diagram" };
  quiz.questions[1].prompt = "Which is $x^2$?\n\n![Graph](images/graph.jpg)";
  const single = quiz.questions[1];
  if (single.type !== "multiple_choice") throw new Error("Bad fixture");
  single.choices[0] = { id: "a", text: "", image: { src: "images/diagram.png" } };
  return quiz;
}

function zip(files: Record<string, Uint8Array>): Uint8Array {
  return zipSync(files);
}

describe("schema versions", () => {
  it("keeps version 1 quizzes valid and unchanged", () => {
    const quiz = makeQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("rejects version 2 features in a version 1 quiz", () => {
    const withFormat = { ...makeQuiz(), textFormat: "markdown" };
    expect(() => parseQuiz(withFormat)).toThrow(/textFormat needs schemaVersion 2/);
    const withImage = makeQuiz();
    withImage.questions[0].image = { src: "images/a.png" };
    expect(() => parseQuiz(withImage)).toThrow(/Images need schemaVersion 2/);
  });

  it("accepts a version 2 quiz with plain text and no images", () => {
    const quiz = { ...makeQuiz(), schemaVersion: 2 as const };
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("accepts markdown, images, and image-only choices in version 2", () => {
    const quiz = makeRichQuiz();
    expect(parseQuiz(quiz)).toEqual(quiz);
  });

  it("rejects image paths outside images/ or of unsupported types", () => {
    for (const src of ["../x.png", "images/../x.png", "x.png", "images/a.bmp", "https://a.b/c.png"]) {
      expect(isImagePath(src)).toBe(false);
      const quiz = makeRichQuiz();
      quiz.questions[0].image = { src };
      expect(() => parseQuiz(quiz)).toThrow();
    }
    const inline = makeRichQuiz();
    inline.questions[0].prompt = "![x](https://example.com/x.png)";
    expect(() => parseQuiz(inline)).toThrow(/inside images\//);
  });

  it("requires a choice to have text or an image", () => {
    const quiz = makeRichQuiz();
    const single = quiz.questions[1];
    if (single.type !== "multiple_choice") throw new Error("Bad fixture");
    single.choices[1] = { id: "b", text: " " };
    expect(() => parseQuiz(quiz)).toThrow(/text or an image/);
  });

  it("lists every referenced image once", () => {
    expect(imageRefs(makeRichQuiz())).toEqual(["images/diagram.png", "images/graph.jpg"]);
    const plain = makeRichQuiz();
    plain.textFormat = "plain";
    expect(imageRefs(plain)).toEqual(["images/diagram.png"]);
  });
});

describe(".quiz packages", () => {
  const assets = new Map([
    ["images/diagram.png", PNG],
    ["images/graph.jpg", JPG],
  ]);

  it("round-trips a quiz and its images", () => {
    const quiz = makeRichQuiz();
    const read = readQuizPackage(writeQuizPackage(quiz, assets));
    expect(read.quiz).toEqual(quiz);
    expect([...read.assets.keys()].sort()).toEqual(["images/diagram.png", "images/graph.jpg"]);
    expect(read.assets.get("images/graph.jpg")).toEqual(JPG);
  });

  it("finds quiz.json inside a single top-level folder", () => {
    const bytes = zip({
      "My Quiz/quiz.json": strToU8(JSON.stringify(makeRichQuiz())),
      "My Quiz/images/diagram.png": PNG,
      "My Quiz/images/graph.jpg": JPG,
      "__MACOSX/My Quiz/._quiz.json": strToU8("junk"),
    });
    expect(readQuizPackage(bytes).assets.size).toBe(2);
  });

  it("rejects a package that is missing a referenced image", () => {
    const bytes = zip({
      "quiz.json": strToU8(JSON.stringify(makeRichQuiz())),
      "images/diagram.png": PNG,
    });
    expect(() => readQuizPackage(bytes)).toThrow(/missing images\/graph.jpg/);
  });

  it("rejects a file whose contents do not match its image type", () => {
    const bytes = zip({
      "quiz.json": strToU8(JSON.stringify(makeRichQuiz())),
      "images/diagram.png": JPG,
      "images/graph.jpg": JPG,
    });
    expect(() => readQuizPackage(bytes)).toThrow(/not a valid image/);
  });

  it("rejects an oversized image before unpacking it", () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(PNG);
    const bytes = zip({
      "quiz.json": strToU8(JSON.stringify(makeRichQuiz())),
      "images/diagram.png": huge,
      "images/graph.jpg": JPG,
    });
    expect(() => readQuizPackage(bytes)).toThrow(/larger than/);
  });

  it("rejects a package without quiz.json", () => {
    expect(() => readQuizPackage(zip({ "other.json": strToU8("{}") }))).toThrow(/no quiz.json/);
  });

  it("reads plain JSON files as before but refuses images in them", () => {
    const plain = makeQuiz();
    expect(readQuizFile(strToU8(JSON.stringify(plain))).quiz).toEqual(plain);
    expect(() => readQuizJson(JSON.stringify(makeRichQuiz()))).toThrow(/\.quiz package/);
  });
});

describe("SVG images", () => {
  const SVG = strToU8('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
  const fakePng = async (svg: string) => {
    expect(svg).toContain("<svg");
    return PNG;
  };

  function svgQuiz(): Quiz {
    const quiz = makeRichQuiz();
    quiz.questions[0].image = { src: "images/diagram.svg", alt: "Diagram" };
    quiz.questions[1].prompt = "Which is it?\n\n![Graph](images/graph.svg) and ![Same](<images/graph.svg>)";
    return quiz;
  }

  it("may appear in a package but never in a stored quiz", () => {
    expect(isPackageImagePath("images/a.svg")).toBe(true);
    expect(isImagePath("images/a.svg")).toBe(false);
  });

  it("are read from a package and checked for SVG content", () => {
    const quiz = svgQuiz();
    const files = {
      "quiz.json": strToU8(JSON.stringify(quiz)),
      "images/diagram.png": PNG,
      "images/diagram.svg": SVG,
      "images/graph.svg": SVG,
    };
    expect(readQuizPackage(zip(files)).assets.size).toBe(3);
    const fake = zip({ ...files, "images/graph.svg": strToU8("not an svg") });
    expect(() => readQuizPackage(fake)).toThrow(/graph.svg is not a valid image/);
  });

  it("are converted to PNG, with every reference renamed and no name clashes", async () => {
    const pkg = readQuizPackage(
      zip({
        "quiz.json": strToU8(JSON.stringify(svgQuiz())),
        "images/diagram.png": PNG,
        "images/diagram.svg": SVG,
        "images/graph.svg": SVG,
      }),
    );
    const converted = await convertSvgImages(pkg, fakePng);
    expect([...converted.assets.keys()].sort()).toEqual([
      "images/diagram-svg.png",
      "images/diagram.png",
      "images/graph.png",
    ]);
    expect(converted.quiz.questions[0].image?.src).toBe("images/diagram-svg.png");
    expect(converted.quiz.questions[1].prompt).toBe(
      "Which is it?\n\n![Graph](images/graph.png) and ![Same](<images/graph.png>)",
    );
    const single = converted.quiz.questions[1];
    if (single.type !== "multiple_choice") throw new Error("Bad fixture");
    expect(single.choices[0].image?.src).toBe("images/diagram.png");
    expect(imageRefs(converted.quiz).every(isImagePath)).toBe(true);
    expect(parseQuiz(converted.quiz)).toBeTruthy();
  });

  it("reports which SVG could not be converted", async () => {
    const pkg = readQuizPackage(
      zip({
        "quiz.json": strToU8(JSON.stringify(svgQuiz())),
        "images/diagram.png": PNG,
        "images/diagram.svg": SVG,
        "images/graph.svg": SVG,
      }),
    );
    await expect(
      convertSvgImages(pkg, () => Promise.reject(new Error("broken drawing"))),
    ).rejects.toThrow(/images\/diagram.svg to PNG: broken drawing/);
    await expect(convertSvgImages(pkg, async () => JPG)).rejects.toThrow(/Could not convert/);
  });
});

describe("stored package images", () => {
  it("keeps image files inside the quiz's asset folder", () => {
    const dir = path.resolve("/library");
    expect(quizAssetsDirInDir(dir, "abc")).toBe(path.join(dir, "abc.assets"));
    expect(quizAssetFileInDir(dir, "abc", "images/a b.png")).toBe(
      path.join(dir, "abc.assets", "images", "a b.png"),
    );
    expect(() => quizAssetFileInDir(dir, "abc", "images/../../x.png")).toThrow();
    expect(() => quizAssetFileInDir(dir, "../abc", "images/a.png")).toThrow();
  });

  it("round-trips desktop image URLs and refuses unsafe ones", () => {
    const url = quizAssetUrl("Quiz-1", "images/a b.png");
    expect(parseQuizAssetUrl(url)).toEqual({ quizId: "Quiz-1", path: "images/a b.png" });
    expect(parseQuizAssetUrl("quizasset://quiz/x/images/..%2Fsecret.png")).toBeNull();
    expect(parseQuizAssetUrl("quizasset://quiz/../images/a.png")).toBeNull();
  });
});

describe("markdown rendering", () => {
  const resolve = (src: string) => (src === "images/a.png" ? "blob:a" : undefined);

  it("renders formatting and math", () => {
    const html = renderMarkdown("**Bold** and $x^2$", resolve);
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<math");
  });

  it("leaves prices with dollar signs as text", () => {
    expect(renderMarkdown("It costs $5 and $10.", resolve)).not.toContain("<math");
  });

  it("never passes raw HTML or script links through", () => {
    const html = renderMarkdown("<img src=x onerror=alert(1)> [x](javascript:alert(1))", resolve);
    expect(html).not.toContain("<img");
    expect(html).not.toContain('href="javascript');
  });

  it("shows only package images and falls back to alt text", () => {
    expect(renderMarkdown("![A](images/a.png)", resolve)).toContain('src="blob:a"');
    const missing = renderMarkdown("![Remote](https://x.y/a.png) ![Gone](images/b.png)", resolve);
    expect(missing).not.toContain("<img");
    expect(missing).toContain("[Remote]");
    expect(missing).toContain("[Gone]");
  });
});
