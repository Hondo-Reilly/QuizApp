import { useId } from "react";
import { useTextDraft } from "@/hooks/useTextDraft";
import { currencySymbol, MAX_NUMERIC_LENGTH, parseNumericAnswer } from "@shared/numeric";
import type { NumericQuestion } from "@shared/types";

export interface NumericAnswerInputProps {
  question: NumericQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  /** Enter moves on, like the primary button. */
  onEnter?: () => void;
}

const affixClasses =
  "flex items-center border-slate-300 bg-slate-50 px-3 text-base text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

/** A number answer, with the currency symbol before it or the unit after it. */
export function NumericAnswerInput({ question, value, onChange, disabled, onEnter }: NumericAnswerInputProps) {
  const hintId = useId();
  const { draft, change, flush } = useTextDraft(value, onChange);
  const prefix = question.currency ? currencySymbol(question.currency) : null;
  const invalid = draft.trim() !== "" && parseNumericAnswer(draft, question) === null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex w-full max-w-xs overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 dark:border-neutral-700 dark:bg-neutral-900">
        {prefix && <span className={`${affixClasses} border-r`} aria-hidden="true">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={question.currency ? `Your answer in ${question.currency}` : "Your answer"}
          aria-describedby={hintId}
          aria-invalid={invalid}
          value={draft}
          maxLength={MAX_NUMERIC_LENGTH}
          disabled={disabled}
          placeholder={question.currency ? "0.00" : "Enter a number"}
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing && onEnter) {
              event.preventDefault();
              flush();
              onEnter();
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:text-slate-600 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:disabled:text-neutral-300"
        />
        {question.unit && <span className={`${affixClasses} border-l`}>{question.unit}</span>}
      </div>
      <div
        id={hintId}
        className={`text-xs ${invalid ? "text-amber-700 dark:text-amber-400" : "text-slate-500 dark:text-neutral-400"}`}
      >
        {invalid ? "Enter a number, like 1,250.5 or -3e4" : question.currency ? `Amount in ${question.currency}` : ""}
      </div>
    </div>
  );
}
