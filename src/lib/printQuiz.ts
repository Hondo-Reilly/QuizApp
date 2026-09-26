import { quizApi } from "@/api/quizApi";
import { scenarioFor, startsScenario } from "@shared/scenarios";
import type { Question, Quiz } from "@shared/types";

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

function choices(question: Question): { text: string; correct: boolean }[] {
  if (question.type === "true_false") {
    return [
      { text: "True", correct: question.answer === true },
      { text: "False", correct: question.answer === false },
    ];
  }
  return question.choices.map((choice) => ({
    text: choice.text,
    correct:
      question.type === "multiple_choice"
        ? question.answer === choice.id
        : question.answers.includes(choice.id),
  }));
}

function keyText(question: Question): string {
  return choices(question)
    .filter((choice) => choice.correct)
    .map((choice) => choice.text)
    .join(", ");
}

function questionHtml(question: Question, index: number, showAnswers: boolean): string {
  const items = choices(question)
    .map((choice) => {
      const mark = showAnswers && choice.correct ? "correct" : "";
      return `<li class="${mark}">${escapeHtml(choice.text)}</li>`;
    })
    .join("");
  return `<section class="question"><h2>${index + 1}. ${escapeHtml(question.prompt)}</h2><ol>${items}</ol></section>`;
}

function scenarioHtml(quiz: Quiz, index: number): string {
  if (!startsScenario(quiz.questions, index)) return "";
  const scenario = scenarioFor(quiz, quiz.questions[index]);
  if (!scenario) return "";
  const title = scenario.title ? `<h3>${escapeHtml(scenario.title)}</h3>` : "";
  return `<section class="scenario">${title}<p>${escapeHtml(scenario.text)}</p></section>`;
}

function buildHtml(quiz: Quiz, options: PrintQuizOptions): string {
  const questions = quiz.questions
    .map(
      (question, index) =>
        scenarioHtml(quiz, index) + questionHtml(question, index, options.showAnswers),
    )
    .join("");
  const key = options.includeKey
    ? `<h2 class="key-title">Answer key</h2><ol class="key">${quiz.questions
        .map((question) => `<li>${escapeHtml(keyText(question))}</li>`)
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

export async function saveQuizPdf(
  quiz: Quiz,
  options: PrintQuizOptions,
): Promise<boolean> {
  return quizApi.saveQuizPdf(buildHtml(quiz, options), pdfFilename(quiz.title));
}
