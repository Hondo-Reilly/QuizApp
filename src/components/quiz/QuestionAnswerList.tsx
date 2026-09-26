import { QuestionResultCard, ResultBadge } from "./QuestionResultCard";
import { ScenarioPanel } from "./ScenarioPanel";
import { gradeQuestion } from "@shared/grading";
import { startsScenario } from "@shared/scenarios";
import type { Choice, Question, Scenario, UserAnswer } from "@shared/types";

export interface QuestionAnswerListProps {
  questions: Question[];
  scenarios?: Scenario[];
  answers?: Record<string, UserAnswer>;
}

type ChoiceMark = "neutral" | "correct" | "picked" | "missed";

function typeLabel(question: Question): string {
  switch (question.type) {
    case "true_false":
      return "True / False";
    case "multiple_choice":
      return "Multiple choice";
    case "multi_answer":
      return "Select all";
  }
}

function isCorrectChoice(question: Question, choice: Choice): boolean {
  if (question.type === "multiple_choice") return question.answer === choice.id;
  if (question.type === "multi_answer") return question.answers.includes(choice.id);
  return false;
}

function isSelected(
  question: Question,
  choiceId: string,
  answer: UserAnswer | undefined,
): boolean {
  if (answer === null || answer === undefined) return false;
  if (question.type === "true_false") {
    if (choiceId === "true") return answer === true;
    if (choiceId === "false") return answer === false;
    return false;
  }
  if (question.type === "multiple_choice") return answer === choiceId;
  return Array.isArray(answer) && answer.includes(choiceId);
}

function ChoiceRow({ text, mark }: { text: string; mark: ChoiceMark }) {
  const wrong = mark === "missed";
  const right = mark === "correct" || mark === "picked";
  const selected = mark === "picked" || mark === "missed";

  return (
    <li
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        wrong
          ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          : right
            ? "border-green-300 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200"
            : "border-slate-200 text-slate-700 dark:border-neutral-800 dark:text-neutral-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          wrong
            ? "bg-red-600 text-white"
            : right
              ? "bg-green-600 text-white"
              : "border border-slate-300 dark:border-neutral-600"
        }`}
      >
        {wrong ? "\u2715" : right ? "\u2713" : ""}
      </span>
      <span className="min-w-0 flex-1">{text}</span>
      {selected && (
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide">
          Selected
        </span>
      )}
    </li>
  );
}

function choicesFor(
  question: Question,
  answer: UserAnswer | undefined,
  showSelections: boolean,
): { id: string; text: string; mark: ChoiceMark }[] {
  const raw =
    question.type === "true_false"
      ? [
          { id: "true", text: "True", correct: question.answer === true },
          { id: "false", text: "False", correct: question.answer === false },
        ]
      : question.choices.map((choice) => ({
          id: choice.id,
          text: choice.text,
          correct: isCorrectChoice(question, choice),
        }));

  return raw.map((choice) => {
    if (!showSelections) {
      return { id: choice.id, text: choice.text, mark: choice.correct ? "correct" : "neutral" };
    }
    const selected = isSelected(question, choice.id, answer);
    let mark: ChoiceMark = "neutral";
    if (selected && choice.correct) mark = "picked";
    else if (selected) mark = "missed";
    else if (choice.correct) mark = "correct";
    return { id: choice.id, text: choice.text, mark };
  });
}

export function QuestionAnswerList({
  questions,
  scenarios,
  answers,
}: QuestionAnswerListProps) {
  const showSelections = answers !== undefined;
  const scenarioById = new Map(scenarios?.map((scenario) => [scenario.id, scenario]));

  return (
    <ol className="flex flex-col gap-4">
      {questions.map((question, index) => {
        const answer = answers?.[question.id];
        const correct = showSelections ? gradeQuestion(question, answer ?? null) : false;
        const scenario = startsScenario(questions, index)
          ? scenarioById.get(question.scenarioId ?? "")
          : undefined;
        return (
          <li key={question.id} className="flex flex-col gap-4">
            {scenario && <ScenarioPanel scenario={scenario} />}
            <QuestionResultCard
              heading={
                <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
                  {index + 1}. {question.prompt}
                </h2>
              }
              status={
                showSelections ? (
                  <ResultBadge correct={correct} />
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {typeLabel(question)}
                  </span>
                )
              }
              explanation={question.explanation}
            >
              <ul className="flex flex-col gap-2">
                {choicesFor(question, answer, showSelections).map((choice) => (
                  <ChoiceRow key={choice.id} text={choice.text} mark={choice.mark} />
                ))}
              </ul>
            </QuestionResultCard>
          </li>
        );
      })}
    </ol>
  );
}
