import type { TrueFalseQuestion } from "@shared/types";
import { optionClasses } from "./answerStyles";

export interface TrueFalseInputProps {
  question: TrueFalseQuestion;
  value: boolean | null;
  onChange: (value: boolean) => void;
  reveal: boolean;
  disabled: boolean;
}

const OPTIONS: ReadonlyArray<{ label: string; value: boolean }> = [
  { label: "True", value: true },
  { label: "False", value: false },
];

export function TrueFalseInput({
  question,
  value,
  onChange,
  reveal,
  disabled,
}: TrueFalseInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        const isCorrectAnswer = question.answer === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={optionClasses({
              selected,
              correct: selected && isCorrectAnswer,
              isCorrectAnswer,
              reveal,
              disabled,
            })}
          >
            <span className="font-medium">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
