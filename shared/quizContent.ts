import type { Question, Quiz, TextFormat } from "./types";

export const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

const SEGMENT = "[A-Za-z0-9_-][A-Za-z0-9._ -]*";
const imagePathPattern = (extensions: string) =>
  new RegExp(`^images/(?:${SEGMENT}/)*${SEGMENT}\\.(?:${extensions})$`, "i");
const RASTER_PATH = imagePathPattern("png|jpe?g|gif|webp");
const PACKAGE_PATH = imagePathPattern("png|jpe?g|gif|webp|svg");

/**
 * Whether a path is an image the app can store and show. SVGs are converted
 * to PNG on import, so stored quizzes never reference one.
 */
export function isImagePath(path: string): boolean {
  return RASTER_PATH.test(path);
}

/** Whether a path is an image a .quiz package may contain, including SVG. */
export function isPackageImagePath(path: string): boolean {
  return PACKAGE_PATH.test(path);
}

export function isSvgPath(path: string): boolean {
  return /\.svg$/i.test(path);
}

export function imageContentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return IMAGE_TYPES[ext] ?? "application/octet-stream";
}

export function textFormatOf(quiz: Pick<Quiz, "textFormat">): TextFormat {
  return quiz.textFormat ?? "plain";
}

// Matches ![alt](src) and ![alt](<src with spaces>), ignoring an optional title.
const MARKDOWN_IMAGE = /(!\[[^\]]*\]\(\s*)(?:<([^>]*)>|([^)\s]+))((?:\s+["'(][^)]*)?\s*\))/g;

export function markdownImageSources(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(MARKDOWN_IMAGE)) {
    out.push(match[2] ?? match[3]);
  }
  return out;
}

/** Every text field that is rendered as Markdown in a markdown quiz. */
export function markdownFields(quiz: Pick<Quiz, "scenarios" | "questions">): string[] {
  const fields: string[] = [];
  for (const scenario of quiz.scenarios ?? []) fields.push(scenario.text);
  for (const question of quiz.questions) {
    fields.push(question.prompt);
    if (question.explanation) fields.push(question.explanation);
    if (question.type !== "true_false") {
      for (const choice of question.choices) fields.push(choice.text);
    }
  }
  return fields;
}

function structuredImages(question: Question): string[] {
  const out: string[] = [];
  if (question.image) out.push(question.image.src);
  if (question.type !== "true_false") {
    for (const choice of question.choices) {
      if (choice.image) out.push(choice.image.src);
    }
  }
  return out;
}

/** Every image path a quiz references, in first-use order. */
export function imageRefs(
  quiz: Pick<Quiz, "textFormat" | "scenarios" | "questions">,
): string[] {
  const refs = new Set<string>();
  for (const scenario of quiz.scenarios ?? []) {
    if (scenario.image) refs.add(scenario.image.src);
  }
  for (const question of quiz.questions) {
    for (const src of structuredImages(question)) refs.add(src);
  }
  if (textFormatOf(quiz) === "markdown") {
    for (const text of markdownFields(quiz)) {
      for (const src of markdownImageSources(text)) refs.add(src);
    }
  }
  return [...refs];
}

/** Returns a copy of the quiz with image paths replaced, e.g. after SVG conversion. */
export function renameImageRefs<T extends Pick<Quiz, "textFormat" | "scenarios" | "questions">>(
  quiz: T,
  renames: ReadonlyMap<string, string>,
): T {
  if (renames.size === 0) return quiz;
  const image = <I extends { src: string } | undefined>(value: I): I =>
    value && renames.has(value.src) ? { ...value, src: renames.get(value.src)! } : value;
  const markdown = textFormatOf(quiz) === "markdown";
  const text = (value: string): string =>
    markdown
      ? value.replace(MARKDOWN_IMAGE, (whole, open: string, angled, bare, close: string) => {
          const src = angled ?? bare;
          const next = renames.get(src);
          if (!next) return whole;
          return angled === undefined ? `${open}${next}${close}` : `${open}<${next}>${close}`;
        })
      : value;

  return {
    ...quiz,
    scenarios: quiz.scenarios?.map((scenario) => ({
      ...scenario,
      text: text(scenario.text),
      image: image(scenario.image),
    })),
    questions: quiz.questions.map((question) => {
      const base = {
        ...question,
        prompt: text(question.prompt),
        explanation: question.explanation === undefined ? undefined : text(question.explanation),
        image: image(question.image),
      };
      if (question.type === "true_false") return base;
      return {
        ...base,
        choices: question.choices.map((choice) => ({
          ...choice,
          text: text(choice.text),
          image: image(choice.image),
        })),
      };
    }) as T["questions"],
  };
}
