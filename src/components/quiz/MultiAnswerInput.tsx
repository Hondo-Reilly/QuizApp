import type { MultiAnswerQuestion } from "@shared/types";
import { ChoiceContent } from "@/components/content/ChoiceContent";
import { optionClasses } from "./answerStyles";
import { orderChoices } from "./orderChoices";

export interface MultiAnswerInputProps {
  question: MultiAnswerQuestion;
  value: string[];
  onChange: (value: string[]) => void;
  reveal: boolean;
  disabled: boolean;
  choiceOrder?: readonly string[];
}

function toggle(values: string[], id: string): string[] {
  return values.includes(id)
    ? values.filter((v) => v !== id)
    : [...values, id];
}

export function MultiAnswerInput({
  question,
  value,
  onChange,
  reveal,
  disabled,
  choiceOrder,
}: MultiAnswerInputProps) {
  const correctSet = new Set(question.answers);
  const choices = orderChoices(question.choices, choiceOrder);

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
        Select all that apply
      </p>
      {choices.map((choice) => {
        const selected = value.includes(choice.id);
        const isCorrectAnswer = correctSet.has(choice.id);
        return (
          <button
            key={choice.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggle(value, choice.id))}
            className={optionClasses({
              selected,
              correct: selected && isCorrectAnswer,
              isCorrectAnswer,
              reveal,
              disabled,
            })}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                selected
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
              }`}
            >
              {selected ? "\u2713" : ""}
            </span>
            <ChoiceContent choice={choice} />
          </button>
        );
      })}
    </div>
  );
}
