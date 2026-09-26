import type { MultipleChoiceQuestion } from "@shared/types";
import { ChoiceContent } from "@/components/content/ChoiceContent";
import { optionClasses } from "./answerStyles";
import { orderChoices } from "./orderChoices";

export interface MultipleChoiceInputProps {
  question: MultipleChoiceQuestion;
  value: string | null;
  onChange: (value: string) => void;
  reveal: boolean;
  disabled: boolean;
  choiceOrder?: readonly string[];
}

export function MultipleChoiceInput({
  question,
  value,
  onChange,
  reveal,
  disabled,
  choiceOrder,
}: MultipleChoiceInputProps) {
  const choices = orderChoices(question.choices, choiceOrder);
  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice) => {
        const selected = value === choice.id;
        const isCorrectAnswer = question.answer === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(choice.id)}
            className={optionClasses({
              selected,
              correct: selected && isCorrectAnswer,
              isCorrectAnswer,
              reveal,
              disabled,
            })}
          >
            <ChoiceContent choice={choice} />
          </button>
        );
      })}
    </div>
  );
}
