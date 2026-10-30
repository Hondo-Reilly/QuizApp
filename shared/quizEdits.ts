import type {
  Choice,
  MatchItem,
  Question,
  QuestionType,
  Quiz,
  Scenario,
} from "./types";

/**
 * Pure edits for the quiz editor. Each returns a new quiz or question and
 * leaves its input untouched, so undo can keep earlier versions as they are.
 * Edits never validate: a half-written quiz is normal while editing, and
 * quizIssues reports what still needs fixing.
 */

/** The first of base1, base2, ... that is not taken. */
export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let n = 1; ; n += 1) {
    const id = `${base}${n}`;
    if (!used.has(id)) return id;
  }
}

/** The first free choice id: a to z, then c27, c28, ... */
function nextChoiceId(choices: readonly Choice[]): string {
  const used = new Set(choices.map((choice) => choice.id));
  for (let code = 97; code <= 122; code += 1) {
    const id = String.fromCharCode(code);
    if (!used.has(id)) return id;
  }
  return uniqueId("c", used);
}

/** Moves one entry to a new position. Out-of-range positions leave the list as is. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) {
    return list.slice();
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function blankChoices(): Choice[] {
  return [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ];
}

/** A new question of a type with nothing filled in yet. */
export function blankQuestion(type: QuestionType, takenIds: Iterable<string>): Question {
  // A written stub carries no choices or answers, so every type starts empty.
  return changeQuestionType({ id: uniqueId("q", takenIds), type: "short_answer", prompt: "" }, type);
}

function choicesOf(question: Question): Choice[] {
  switch (question.type) {
    case "multiple_choice":
    case "multi_answer":
    case "matching":
      return question.choices;
    case "true_false":
      return [
        { id: "a", text: "True" },
        { id: "b", text: "False" },
      ];
    default:
      return blankChoices();
  }
}

/** Choice ids marked correct, in the shape every choice type can reuse. */
function correctChoiceIds(question: Question): string[] {
  switch (question.type) {
    case "multiple_choice":
      return question.answer ? [question.answer] : [];
    case "multi_answer":
      return question.answers;
    case "true_false":
      return [question.answer ? "a" : "b"];
    case "matching":
      return [...new Set(question.items.map((item) => item.answer).filter(Boolean))];
    default:
      return [];
  }
}

/**
 * Converts a question to another type, keeping what carries over: the id,
 * prompt, scenario, image, and explanation always; choices and correct answers
 * between choice types; the sample answer and rubric between written types.
 */
export function changeQuestionType(question: Question, type: QuestionType): Question {
  if (question.type === type) return question;
  const common = {
    id: question.id,
    prompt: question.prompt,
    scenarioId: question.scenarioId,
    image: question.image,
    explanation: question.explanation,
  };
  const choices = choicesOf(question);
  const correct = correctChoiceIds(question);
  const open =
    question.type === "short_answer" ||
    question.type === "long_answer" ||
    question.type === "image_response"
      ? { sampleAnswer: question.sampleAnswer, rubric: question.rubric }
      : {};

  switch (type) {
    case "true_false":
      return { ...common, type, answer: true };
    case "multiple_choice":
      return { ...common, type, choices, answer: correct[0] ?? "" };
    case "multi_answer":
      return { ...common, type, choices, answers: correct };
    case "numeric":
      return { ...common, type, answer: 0 };
    case "matching":
      return { ...common, type, choices, items: [{ id: "1", text: "", answer: "" }] };
    case "short_answer":
    case "long_answer":
    case "image_response":
      return { ...common, ...open, type };
  }
}

function indexOfQuestion(quiz: Quiz, id: string): number {
  return quiz.questions.findIndex((question) => question.id === id);
}

/** Inserts a question at a position, or at the end. */
export function addQuestion(quiz: Quiz, question: Question, index = quiz.questions.length): Quiz {
  const questions = quiz.questions.slice();
  questions.splice(Math.max(0, Math.min(index, questions.length)), 0, question);
  return { ...quiz, questions };
}

export function updateQuestion(
  quiz: Quiz,
  id: string,
  change: (question: Question) => Question,
): Quiz {
  return {
    ...quiz,
    questions: quiz.questions.map((question) => (question.id === id ? change(question) : question)),
  };
}

export function removeQuestion(quiz: Quiz, id: string): Quiz {
  return { ...quiz, questions: quiz.questions.filter((question) => question.id !== id) };
}

export function moveQuestion(quiz: Quiz, from: number, to: number): Quiz {
  return { ...quiz, questions: moveItem(quiz.questions, from, to) };
}

/** Copies a question, with a new id, right after the original. */
export function duplicateQuestion(quiz: Quiz, id: string): Quiz {
  const index = indexOfQuestion(quiz, id);
  if (index === -1) return quiz;
  const copy = structuredClone(quiz.questions[index]);
  copy.id = uniqueId("q", quiz.questions.map((question) => question.id));
  return addQuestion(quiz, copy, index + 1);
}

type ChoiceQuestionOf = Extract<Question, { choices: Choice[] }>;

export function addChoice<Q extends ChoiceQuestionOf>(question: Q): Q {
  return { ...question, choices: [...question.choices, { id: nextChoiceId(question.choices), text: "" }] };
}

export function updateChoice<Q extends ChoiceQuestionOf>(
  question: Q,
  choiceId: string,
  change: Partial<Omit<Choice, "id">>,
): Q {
  return {
    ...question,
    choices: question.choices.map((choice) => (choice.id === choiceId ? { ...choice, ...change } : choice)),
  };
}

/**
 * Removes a choice and every reference to it. A multiple-choice answer or a
 * matching item that pointed at it is left empty, for the author to pick again.
 */
export function removeChoice<Q extends ChoiceQuestionOf>(question: Q, choiceId: string): Q {
  const choices = question.choices.filter((choice) => choice.id !== choiceId);
  switch (question.type) {
    case "multiple_choice":
      return { ...question, choices, answer: question.answer === choiceId ? "" : question.answer };
    case "multi_answer":
      return { ...question, choices, answers: question.answers.filter((id) => id !== choiceId) };
    case "matching":
      return {
        ...question,
        choices,
        items: question.items.map((item) => (item.answer === choiceId ? { ...item, answer: "" } : item)),
      };
    default:
      return { ...question, choices };
  }
}

export function moveChoice<Q extends ChoiceQuestionOf>(question: Q, from: number, to: number): Q {
  return { ...question, choices: moveItem(question.choices, from, to) };
}

type MatchingQuestionOf = Extract<Question, { type: "matching" }>;

export function addMatchItem(question: MatchingQuestionOf): MatchingQuestionOf {
  const id = uniqueId("", question.items.map((item) => item.id));
  return { ...question, items: [...question.items, { id, text: "", answer: "" }] };
}

export function updateMatchItem(
  question: MatchingQuestionOf,
  itemId: string,
  change: Partial<Omit<MatchItem, "id">>,
): MatchingQuestionOf {
  return {
    ...question,
    items: question.items.map((item) => (item.id === itemId ? { ...item, ...change } : item)),
  };
}

export function removeMatchItem(question: MatchingQuestionOf, itemId: string): MatchingQuestionOf {
  return { ...question, items: question.items.filter((item) => item.id !== itemId) };
}

export function moveMatchItem(question: MatchingQuestionOf, from: number, to: number): MatchingQuestionOf {
  return { ...question, items: moveItem(question.items, from, to) };
}

export function addScenario(quiz: Quiz): { quiz: Quiz; scenario: Scenario } {
  const scenarios = quiz.scenarios ?? [];
  const scenario: Scenario = { id: uniqueId("s", scenarios.map((item) => item.id)), text: "" };
  return { quiz: { ...quiz, scenarios: [...scenarios, scenario] }, scenario };
}

export function updateScenario(
  quiz: Quiz,
  id: string,
  change: Partial<Omit<Scenario, "id">>,
): Quiz {
  return {
    ...quiz,
    scenarios: (quiz.scenarios ?? []).map((scenario) => (scenario.id === id ? { ...scenario, ...change } : scenario)),
  };
}

/** Removes a scenario. Its questions stay, without a scenario. */
export function removeScenario(quiz: Quiz, id: string): Quiz {
  const scenarios = (quiz.scenarios ?? []).filter((scenario) => scenario.id !== id);
  return {
    ...quiz,
    scenarios: scenarios.length > 0 ? scenarios : undefined,
    questions: quiz.questions.map((question) =>
      question.scenarioId === id ? { ...question, scenarioId: undefined } : question,
    ),
  };
}

/** A new, empty quiz for the editor to start from. Saved quizzes are always version 2. */
export function blankQuiz(): Quiz {
  return {
    schemaVersion: 2,
    id: "",
    title: "",
    questions: [blankQuestion("multiple_choice", [])],
  };
}

/**
 * Applies a change to every field that Markdown formats: prompts,
 * explanations, choices, matching items, scenario text, and the sample
 * answers and rubrics of written questions (not code).
 */
export function mapQuizText(quiz: Quiz, change: (text: string) => string): Quiz {
  const optional = (text: string | undefined) => (text === undefined ? undefined : change(text));
  return {
    ...quiz,
    scenarios: quiz.scenarios?.map((scenario) => ({ ...scenario, text: change(scenario.text) })),
    questions: quiz.questions.map((question): Question => {
      const base = { ...question, prompt: change(question.prompt), explanation: optional(question.explanation) };
      switch (base.type) {
        case "multiple_choice":
        case "multi_answer":
          return { ...base, choices: base.choices.map((choice) => ({ ...choice, text: change(choice.text) })) };
        case "matching":
          return {
            ...base,
            choices: base.choices.map((choice) => ({ ...choice, text: change(choice.text) })),
            items: base.items.map((item) => ({ ...item, text: change(item.text) })),
          };
        case "short_answer":
        case "image_response":
          return { ...base, sampleAnswer: optional(base.sampleAnswer), rubric: base.rubric?.map(change) };
        case "long_answer":
          return base.code
            ? { ...base, rubric: base.rubric?.map(change) }
            : { ...base, sampleAnswer: optional(base.sampleAnswer), rubric: base.rubric?.map(change) };
        default:
          return base;
      }
    }),
  };
}

const LONE_DOLLAR = /(?<!\\)\$/g;

/** How many formatted fields have a $ that Markdown would read as math. */
export function countDollarFields(quiz: Quiz): number {
  let count = 0;
  mapQuizText(quiz, (text) => {
    if (new RegExp(LONE_DOLLAR).test(text)) count += 1;
    return text;
  });
  return count;
}

/** Turns every $ into \$, so prices stay text once Markdown is on. */
export function escapeDollars(quiz: Quiz): Quiz {
  return mapQuizText(quiz, (text) => text.replace(LONE_DOLLAR, "\\$"));
}
