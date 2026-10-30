import { choiceLetter } from "./matching";
import { isOpenQuestion } from "./questionTypes";
import type { Quiz } from "./types";

/** Advice that makes a quiz better but never blocks saving. */
export interface QuizSuggestion {
  /** The question to open when the suggestion is clicked. */
  questionId?: string;
  message: string;
}

function numbers(positions: readonly number[]): string {
  const list = positions.map((index) => String(index + 1));
  if (list.length <= 2) return list.join(" and ");
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Questions are counted from 1 in messages, as they are in the editor's list. */
export function quizSuggestions(quiz: Quiz): QuizSuggestion[] {
  const out: QuizSuggestion[] = [];
  const questions = quiz.questions;

  // Explanations are where people learn from a miss.
  const unexplained = questions
    .map((question, index) => (!isOpenQuestion(question) && !question.explanation?.trim() ? index : -1))
    .filter((index) => index >= 0);
  if (unexplained.length > 0) {
    out.push({
      questionId: questions[unexplained[0]].id,
      message: `${plural(unexplained.length, "Question", "Questions")} ${numbers(unexplained)} ${plural(unexplained.length, "has", "have")} no explanation. An explanation is where people learn from a wrong answer.`,
    });
  }

  // Written answers are compared with the sample, so one without is hard to check.
  const noSample = questions
    .map((question, index) => (isOpenQuestion(question) && !question.sampleAnswer?.trim() ? index : -1))
    .filter((index) => index >= 0);
  if (noSample.length > 0) {
    out.push({
      questionId: questions[noSample[0]].id,
      message: `${plural(noSample.length, "Question", "Questions")} ${numbers(noSample)} ${plural(noSample.length, "has", "have")} no sample answer, so there's nothing to compare an answer with.`,
    });
  }

  // The correct answer sitting in the same place is a pattern people pick up on.
  const positions = questions.flatMap((question, index) => {
    if (question.type !== "multiple_choice") return [];
    const at = question.choices.findIndex((choice) => choice.id === question.answer);
    return at >= 0 ? [{ at, index }] : [];
  });
  if (positions.length >= 4) {
    const counts = new Map<number, number>();
    for (const { at } of positions) counts.set(at, (counts.get(at) ?? 0) + 1);
    const [common, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (count / positions.length >= 0.6) {
      out.push({
        questionId: questions[positions.find(({ at }) => at === common)!.index].id,
        message: `The correct answer is choice ${choiceLetter(common)} in ${count} of ${positions.length} multiple-choice questions. Someone who notices can guess it, unless they shuffle choices. Try moving some answers.`,
      });
    }
  }

  const trueFalse = questions.flatMap((question, index) => (question.type === "true_false" ? [{ answer: question.answer, index }] : []));
  if (trueFalse.length >= 4 && trueFalse.every(({ answer }) => answer === trueFalse[0].answer)) {
    out.push({
      questionId: questions[trueFalse[0].index].id,
      message: `All ${trueFalse.length} true/false answers are ${trueFalse[0].answer ? "True" : "False"}, which makes them easy to guess.`,
    });
  }

  // With one statement per item and none left over, the last match falls out by elimination.
  questions.forEach((question, index) => {
    if (question.type !== "matching" || question.reuseChoices) return;
    if (question.items.length >= 2 && question.choices.length <= question.items.length) {
      out.push({
        questionId: question.id,
        message: `Question ${index + 1} has no extra statements, so the last match can be found by elimination. Add a distractor or two.`,
      });
    }
  });

  const seen = new Map<string, number>();
  questions.forEach((question, index) => {
    const prompt = question.prompt.trim().toLowerCase().replace(/\s+/g, " ");
    if (!prompt) return;
    const first = seen.get(prompt);
    if (first === undefined) {
      seen.set(prompt, index);
      return;
    }
    out.push({ questionId: question.id, message: `Questions ${first + 1} and ${index + 1} have the same prompt.` });
  });

  return out;
}
