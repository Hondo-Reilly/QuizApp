import type { ZodIssue } from "zod";
import { choiceLetter } from "./matching";
import { questionSchemas, quizSchema } from "./schema";
import type { Question, QuestionType, Quiz } from "./types";

/** One reason a quiz can't be saved, placed on the question, scenario, or field it is about. */
export interface QuizIssue {
  /** The question it belongs to. Missing for quiz and scenario issues. */
  questionId?: string;
  scenarioId?: string;
  /** Path inside the question, scenario, or quiz, e.g. "choices.1.text". Empty for the whole thing. */
  field: string;
  message: string;
}

// The schema's messages are written for people editing JSON; these are for the editor.
const MESSAGES: Record<string, string> = {
  "answer must match one of the choice ids": "Choose the correct answer.",
  "answers must reference choice ids": "A correct answer points at a choice that no longer exists.",
  "answers must be unique": "A correct answer is marked twice.",
  "Choice ids must be unique": "Two choices share an id.",
  "Item ids must be unique": "Two items share an id.",
  "Each item's answer must match one of the choice ids": "Every item needs a match from the choice bank.",
  "Items share a choice; set reuseChoices: true to allow that":
    'Two items share a choice. Turn on "Let a choice match more than one item", or pick another match.',
  "currency must be an ISO 4217 code such as USD": "Choose a currency.",
  "Use currency or unit, not both": "Use a currency or a unit, not both.",
  "minLength must not be more than maxLength": "The minimum length is more than the maximum.",
  "language only applies to a code answer (code: true)": "A language only applies to code answers.",
  "src must be a png, jpg, gif, webp, or svg file inside images/": "Images must be png, jpg, gif, or webp files.",
};

const PREFIXED: [string, string][] = [
  ["Duplicate question id", "Two questions share an id."],
  ["Duplicate scenario id", "Two scenarios share an id."],
  ["scenarioId ", "This question's scenario no longer exists."],
  ["Image ", "Images must be png, jpg, gif, or webp files."],
];

const FIELD_NAMES: Record<string, string> = {
  prompt: "The prompt",
  explanation: "The explanation",
  title: "The title",
  text: "The text",
  sampleAnswer: "The sample answer",
  tolerance: "The tolerance",
  unit: "The unit",
  answer: "The correct answer",
  minLength: "The minimum length",
  maxLength: "The maximum length",
  maxImages: "The photo limit",
  alt: "The image description",
};

const LIST_NAMES: Record<string, string> = {
  choices: "choices",
  items: "items",
  questions: "questions",
  rubric: "rubric points",
};

/** What a path points at, for the start of a message, e.g. "Choice 2" or "The prompt". */
function label(path: readonly (string | number)[], question?: Question): string {
  const [first, second] = path;
  // A matching bank is lettered, so its choices are named by letter.
  if (first === "choices" && typeof second === "number") {
    return question?.type === "matching" ? `Choice ${choiceLetter(second)}` : `Choice ${second + 1}`;
  }
  if (first === "items" && typeof second === "number") return `Item ${second + 1}`;
  if (first === "rubric" && typeof second === "number") return `Rubric point ${second + 1}`;
  const last = [...path].reverse().find((part): part is string => typeof part === "string");
  return (last && FIELD_NAMES[last]) ?? "This field";
}

function friendlyMessage(issue: ZodIssue, path: readonly (string | number)[], question?: Question): string {
  if (issue.message === "A choice needs text or an image") return `${label(path, question)} needs text or an image.`;
  if (MESSAGES[issue.message]) return MESSAGES[issue.message];
  for (const [prefix, message] of PREFIXED) if (issue.message.startsWith(prefix)) return message;

  const last = path[path.length - 1];
  switch (issue.code) {
    case "too_small":
      if (issue.type === "string") {
        if (path[0] === "items" && last === "answer") return `${label(path, question)} needs a match.`;
        if (last === "answer" && question?.type === "multiple_choice") return "Choose the correct answer.";
        return `${label(path, question)} can't be empty.`;
      }
      if (issue.type === "array") {
        if (last === "answers") return "Mark at least one correct choice.";
        if (last === "rubric") return "Add a rubric point, or remove the rubric.";
        const name = typeof last === "string" ? (LIST_NAMES[last] ?? "entries") : "entries";
        return `Add at least ${issue.minimum} ${Number(issue.minimum) === 1 ? name.replace(/s$/, "") : name}.`;
      }
      if (last === "tolerance") return "The tolerance can't be negative.";
      return `${label(path, question)} must be at least ${issue.minimum}.`;
    case "too_big":
      if (issue.type === "array") {
        const name = typeof last === "string" ? (LIST_NAMES[last] ?? "entries") : "entries";
        return `Use at most ${issue.maximum} ${name}.`;
      }
      if (issue.type === "string") return `${label(path, question)} is too long (${issue.maximum} characters at most).`;
      return `${label(path, question)} must be at most ${issue.maximum}.`;
    case "invalid_type":
      if (issue.expected === "number") return `${label(path, question)} must be a number.`;
      if (issue.received === "undefined") return `${label(path, question)} is missing.`;
      return issue.message;
    case "invalid_string":
      return last === "language" ? "Use a short language name, like python." : issue.message;
    default:
      return issue.message;
  }
}

/** Issues within one question, from its own type's schema. */
function questionIssues(question: Question): QuizIssue[] {
  const schema = questionSchemas[question.type as QuestionType];
  if (!schema) return [{ questionId: question.id, field: "type", message: "Choose a question type." }];
  const result = schema.safeParse(question);
  if (result.success) return [];
  const issues = result.error.issues.map((issue) => ({
    questionId: question.id,
    field: issue.path.join("."),
    message: friendlyMessage(issue, issue.path, question),
  }));
  // An item already flagged for a missing match makes the question-wide message repeat it.
  const itemFlagged = issues.some((issue) => /^items\.\d+\.answer$/.test(issue.field));
  return itemFlagged ? issues.filter((issue) => issue.field !== "items") : issues;
}

/**
 * Every reason the quiz can't be saved yet, each placed on its question,
 * scenario, or quiz field. An empty list means the quiz is valid.
 */
export function quizIssues(quiz: Quiz): QuizIssue[] {
  const result = quizSchema.safeParse(quiz);
  if (result.success) return [];

  const out: QuizIssue[] = [];
  const seen = new Set<string>();
  const add = (issue: QuizIssue) => {
    const key = [issue.questionId, issue.scenarioId, issue.field, issue.message].join("\u0000");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(issue);
  };

  const checked = new Set<Question>();
  for (const issue of result.error.issues) {
    const [head, index, ...rest] = issue.path;
    const question = head === "questions" && typeof index === "number" ? quiz.questions[index] : undefined;
    const scenario = head === "scenarios" && typeof index === "number" ? quiz.scenarios?.[index] : undefined;
    if (question) {
      // Only the quiz-wide checks (shared ids, missing scenarios) are kept from this pass.
      // Everything else comes from the question's own schema, which names the field
      // whether or not the question matched a type.
      if (issue.code === "custom" && (rest[0] === "id" || rest[0] === "scenarioId")) {
        add({ questionId: question.id, field: rest.join("."), message: friendlyMessage(issue, rest, question) });
      } else if (!checked.has(question)) {
        checked.add(question);
        questionIssues(question).forEach(add);
      }
    } else if (scenario) {
      add({ scenarioId: scenario.id, field: rest.join("."), message: friendlyMessage(issue, rest) });
    } else if (head === "id" && !quiz.id) {
      // A new quiz gets its id when it is first saved.
      continue;
    } else {
      add({ field: issue.path.join("."), message: friendlyMessage(issue, issue.path) });
    }
  }
  return out;
}

/** An issue as one line for a list, e.g. "Question 9: Two items share a choice." */
export function describeIssue(quiz: Quiz, issue: QuizIssue): string {
  if (issue.questionId) {
    const index = quiz.questions.findIndex((question) => question.id === issue.questionId);
    return `Question ${index + 1}: ${issue.message}`;
  }
  if (issue.scenarioId) {
    const scenario = quiz.scenarios?.find((item) => item.id === issue.scenarioId);
    return `${scenario?.title || "Scenario"}: ${issue.message}`;
  }
  return issue.message;
}
