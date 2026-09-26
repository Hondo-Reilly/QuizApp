import type { Question, Quiz, Scenario } from "./types";

export function scenarioFor(
  quiz: Pick<Quiz, "scenarios">,
  question: Question,
): Scenario | undefined {
  if (!question.scenarioId) return undefined;
  return quiz.scenarios?.find((scenario) => scenario.id === question.scenarioId);
}

/**
 * Splits questions into blocks that stay together when shuffled: each
 * scenario's questions form one block in authored order, and every question
 * without a scenario is its own block.
 */
export function scenarioBlocks(questions: readonly Question[]): Question[][] {
  const blocks: Question[][] = [];
  const byScenario = new Map<string, Question[]>();
  for (const question of questions) {
    if (!question.scenarioId) {
      blocks.push([question]);
      continue;
    }
    const block = byScenario.get(question.scenarioId);
    if (block) {
      block.push(question);
    } else {
      const next = [question];
      byScenario.set(question.scenarioId, next);
      blocks.push(next);
    }
  }
  return blocks;
}

/** Whether a list should show this question's scenario before it. */
export function startsScenario(
  questions: readonly Question[],
  index: number,
): boolean {
  const scenarioId = questions[index]?.scenarioId;
  return !!scenarioId && questions[index - 1]?.scenarioId !== scenarioId;
}
