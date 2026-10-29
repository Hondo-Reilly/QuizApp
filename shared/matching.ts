import type { Choice, MatchAnswer, MatchingQuestion, UserAnswer } from "./types";

export function isMatchAnswer(value: UserAnswer | undefined): value is MatchAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const matches = (value as MatchAnswer).matches;
  return !!matches && typeof matches === "object" && !Array.isArray(matches);
}

export function matchesOf(value: UserAnswer | undefined): Record<string, string> {
  return isMatchAnswer(value) ? value.matches : {};
}

/** A, B, ... Z, then AA, AB, ... for long choice banks. */
export function choiceLetter(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : choiceLetter(Math.floor(index / 26) - 1) + letter;
}

/** How many items the answer matched to their correct choice. */
export function countCorrectMatches(question: MatchingQuestion, value: UserAnswer | undefined): number {
  const matches = matchesOf(value);
  return question.items.filter((item) => matches[item.id] === item.answer).length;
}

export function isMatchingCorrect(question: MatchingQuestion, value: UserAnswer | undefined): boolean {
  return countCorrectMatches(question, value) === question.items.length;
}

/**
 * The answer after picking a choice for one item. An empty choice id clears
 * the item. When choices can't be reused, picking one moves it off any other item.
 */
export function withMatch(
  question: MatchingQuestion,
  value: UserAnswer | undefined,
  itemId: string,
  choiceId: string,
): MatchAnswer | null {
  const matches = { ...matchesOf(value) };
  if (!question.reuseChoices && choiceId) {
    for (const [other, picked] of Object.entries(matches)) {
      if (other !== itemId && picked === choiceId) delete matches[other];
    }
  }
  if (choiceId) matches[itemId] = choiceId;
  else delete matches[itemId];
  return Object.keys(matches).length > 0 ? { matches } : null;
}

/** Each choice with its letter, in the order shown. */
export function letteredChoices(choices: readonly Choice[]): (Choice & { letter: string })[] {
  return choices.map((choice, index) => ({ ...choice, letter: choiceLetter(index) }));
}
