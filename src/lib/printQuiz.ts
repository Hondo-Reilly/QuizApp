import { quizApi } from "@/api/quizApi";
import { imageRefs, textFormatOf } from "@shared/quizContent";
import { scenarioFor, startsScenario } from "@shared/scenarios";
import { isChoiceQuestion, isCodeQuestion, isOpenQuestion, textLimits } from "@shared/questionTypes";
import type { OpenQuestion, Question, Quiz, QuizImage } from "@shared/types";

export interface PrintQuizOptions {
  showAnswers: boolean;
  includeKey: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface PrintContext {
  markdown: typeof import("./markdown").renderMarkdown | null;
  imageUrl: (src: string) => string | undefined;
}

function textHtml(text: string, ctx: PrintContext, inline = false): string {
  if (!ctx.markdown) return escapeHtml(text);
  return ctx.markdown(text, ctx.imageUrl, { inline });
}

function imageHtml(image: QuizImage | undefined, ctx: PrintContext, className: string): string {
  if (!image) return "";
  const url = ctx.imageUrl(image.src);
  if (!url) return "";
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(image.alt ?? "")}" />`;
}

function choices(
  question: Question,
): { text: string; image?: QuizImage; correct: boolean }[] {
  if (!isChoiceQuestion(question) && question.type !== "true_false") return [];
  if (question.type === "true_false") {
    return [
      { text: "True", correct: question.answer === true },
      { text: "False", correct: question.answer === false },
    ];
  }
  return question.choices.map((choice) => ({
    text: choice.text,
    image: choice.image,
    correct:
      question.type === "multiple_choice"
        ? question.answer === choice.id
        : question.answers.includes(choice.id),
  }));
}

function sampleHtml(question: OpenQuestion, ctx: PrintContext): string {
  if (!question.sampleAnswer) return "";
  if (isCodeQuestion(question)) return `<pre class="code">${escapeHtml(question.sampleAnswer)}</pre>`;
  return ctx.markdown ? textHtml(question.sampleAnswer, ctx) : `<p>${escapeHtml(question.sampleAnswer)}</p>`;
}

/** Room to write or attach an answer on paper, sized to the question's limits. */
function responseSpaceHtml(question: OpenQuestion): string {
  if (question.type === "image_response") {
    return `<div class="response-box">Draw or attach your answer here</div>`;
  }
  if (isCodeQuestion(question)) {
    return `<div class="response-box code-box"></div>`;
  }
  const { maxLength } = textLimits(question);
  const lines =
    question.type === "short_answer"
      ? Math.min(3, Math.max(1, Math.ceil(maxLength / 90)))
      : Math.min(20, Math.max(4, Math.ceil(maxLength / 90)));
  return `<div class="lines">${"<div></div>".repeat(lines)}</div>`;
}

// Choice ids (a, b, ...) identify image-only choices in the answer key.
function keyHtml(question: Question, ctx: PrintContext): string {
  if (isOpenQuestion(question)) {
    return question.sampleAnswer ? sampleHtml(question, ctx) : "Answers vary";
  }
  return choices(question)
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => choice.correct)
    .map(({ choice, index }) =>
      choice.text.trim()
        ? textHtml(choice.text, ctx, true)
        : `Choice ${index + 1}`,
    )
    .join(", ");
}

function questionHtml(
  question: Question,
  index: number,
  showAnswers: boolean,
  ctx: PrintContext,
): string {
  const items = choices(question)
    .map((choice) => {
      const mark = showAnswers && choice.correct ? "correct" : "";
      const image = imageHtml(choice.image, ctx, "choice-image");
      return `<li class="${mark}">${image}${textHtml(choice.text, ctx, true)}</li>`;
    })
    .join("");
  const image = imageHtml(question.image, ctx, "question-image");
  const prompt = `<div class="prompt"><span>${index + 1}.</span><div>${textHtml(question.prompt, ctx)}</div></div>`;
  if (isOpenQuestion(question)) {
    const sample =
      showAnswers && question.sampleAnswer
        ? `<div class="sample"><strong>Sample answer</strong>${sampleHtml(question, ctx)}</div>`
        : "";
    return `<section class="question">${prompt}${image}${responseSpaceHtml(question)}${sample}</section>`;
  }
  return `<section class="question">${prompt}${image}<ol>${items}</ol></section>`;
}

function scenarioHtml(quiz: Quiz, index: number, ctx: PrintContext): string {
  if (!startsScenario(quiz.questions, index)) return "";
  const scenario = scenarioFor(quiz, quiz.questions[index]);
  if (!scenario) return "";
  const title = scenario.title ? `<h3>${escapeHtml(scenario.title)}</h3>` : "";
  const text = ctx.markdown
    ? `<div>${textHtml(scenario.text, ctx)}</div>`
    : `<p>${escapeHtml(scenario.text)}</p>`;
  const image = imageHtml(scenario.image, ctx, "question-image");
  return `<section class="scenario">${title}${text}${image}</section>`;
}

function buildHtml(quiz: Quiz, options: PrintQuizOptions, ctx: PrintContext): string {
  const questions = quiz.questions
    .map(
      (question, index) =>
        scenarioHtml(quiz, index, ctx) +
        questionHtml(question, index, options.showAnswers, ctx),
    )
    .join("");
  const key = options.includeKey
    ? `<h2 class="key-title">Answer key</h2><ol class="key">${quiz.questions
        .map((question) => `<li>${keyHtml(question, ctx)}</li>`)
        .join("")}</ol>`
    : "";
  const description = quiz.description
    ? `<p class="description">${escapeHtml(quiz.description)}</p>`
    : "";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(quiz.title)}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; margin: 0.75in; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .description { color: #444; margin: 0 0 24px; }
    .question { break-inside: avoid; margin: 0 0 18px; }
    h2 { font-size: 15px; margin: 0 0 8px; }
    .prompt { display: flex; gap: 4px; font-size: 15px; font-weight: 700; margin: 0 0 8px; }
    .prompt p, li p, .scenario p { margin: 0 0 6px; }
    .question-image { display: block; max-width: 100%; max-height: 3.5in; margin: 0 0 8px; }
    .choice-image { display: block; max-width: 2.5in; max-height: 1.5in; margin: 2px 0; }
    .rich-image { max-width: 100%; max-height: 3in; }
    code { font-family: Menlo, monospace; font-size: 0.9em; }
    pre { white-space: pre-wrap; background: #f4f4f4; padding: 6px; }
    table { border-collapse: collapse; margin: 4px 0 8px; }
    th, td { border: 1px solid #999; padding: 2px 6px; }
    eqn { display: block; text-align: center; margin: 6px 0; }
    .lines div { border-bottom: 1px solid #bbb; height: 28px; }
    .response-box { border: 1px solid #999; border-radius: 4px; height: 2.8in; color: #999; font-size: 12px; padding: 6px; }
    .code-box { height: 3.2in; }
    pre.code { font-family: Menlo, monospace; font-size: 11px; white-space: pre-wrap; background: #f4f4f4; padding: 6px; margin: 4px 0; }
    .sample { margin-top: 8px; font-size: 13px; }
    .sample strong { display: block; margin-bottom: 2px; }
    .scenario { border-left: 3px solid #999; padding: 4px 0 4px 12px; margin: 24px 0 16px; break-inside: avoid; }
    .scenario h3 { font-size: 15px; margin: 0 0 6px; }
    .scenario p { margin: 0; white-space: pre-line; }
    ol { margin: 0; padding-left: 1.4em; }
    li { margin: 4px 0; }
    li.correct { font-weight: 700; }
    li.correct::after { content: " \\2713"; }
    .key-title { margin-top: 32px; font-size: 18px; page-break-before: always; }
    .key { padding-left: 1.4em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(quiz.title)}</h1>
  ${description}
  ${questions}
  ${key}
</body>
</html>`;
}

function pdfFilename(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "quiz";
  return `${slug}.pdf`;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read an image."));
    reader.readAsDataURL(blob);
  });
}

// The print document is self-contained, so images are embedded as data URLs.
async function imageDataUrls(quiz: Quiz): Promise<Record<string, string>> {
  const paths = imageRefs(quiz);
  if (paths.length === 0) return {};
  const urls = await quizApi.getQuizAssetUrls(quiz.id, paths);
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(urls)) {
    try {
      const response = await fetch(url);
      if (response.ok) out[path] = await readAsDataUrl(await response.blob());
    } catch {
      // A missing image is left out of the printout rather than failing it.
    }
  }
  return out;
}

export async function saveQuizPdf(
  quiz: Quiz,
  options: PrintQuizOptions,
): Promise<boolean> {
  const dataUrls = await imageDataUrls(quiz);
  const ctx: PrintContext = {
    markdown:
      textFormatOf(quiz) === "markdown"
        ? (await import("./markdown")).renderMarkdown
        : null,
    imageUrl: (src) => dataUrls[src],
  };
  return quizApi.saveQuizPdf(buildHtml(quiz, options, ctx), pdfFilename(quiz.title));
}
