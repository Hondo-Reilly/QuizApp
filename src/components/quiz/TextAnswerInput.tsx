import { useEffect, useId, useRef } from "react";
import { useTextDraft } from "@/hooks/useTextDraft";
import { textLimits } from "@shared/questionTypes";
import type { LongAnswerQuestion, ShortAnswerQuestion } from "@shared/types";

export interface TextAnswerInputProps {
  question: ShortAnswerQuestion | LongAnswerQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  /** Short answers: Enter moves on, like the primary button. */
  onEnter?: () => void;
}

export function CharacterCount({
  length,
  minLength,
  maxLength,
  id,
}: {
  length: number;
  minLength: number;
  maxLength: number;
  id: string;
}) {
  const short = minLength > 0 && length < minLength;
  return (
    <div id={id} className="flex justify-between gap-3 text-xs text-slate-500 dark:text-neutral-400">
      <span className={short ? "text-amber-700 dark:text-amber-400" : undefined}>
        {minLength > 0 ? `At least ${minLength.toLocaleString()} characters` : ""}
      </span>
      <span className="tabular-nums">
        {length.toLocaleString()} / {maxLength.toLocaleString()}
      </span>
    </div>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-50 disabled:text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-900/60 dark:disabled:text-neutral-300";

/** A short one-line answer or a longer written answer, with a character counter. */
export function TextAnswerInput({ question, value, onChange, disabled, onEnter }: TextAnswerInputProps) {
  const { minLength, maxLength } = textLimits(question);
  const countId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const { draft, change, flush } = useTextDraft(value, onChange);

  // A long answer grows with its text instead of scrolling inside a small box.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight + 2}px`;
  }, [draft]);

  if (question.type === "short_answer") {
    return (
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          aria-label="Your answer"
          aria-describedby={countId}
          value={draft}
          maxLength={maxLength}
          disabled={disabled}
          placeholder="Type your answer"
          onChange={(event) => change(event.target.value)}
          onBlur={flush}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing && onEnter) {
              event.preventDefault();
              flush();
              onEnter();
            }
          }}
          className={fieldClasses}
        />
        <CharacterCount id={countId} length={draft.length} minLength={minLength} maxLength={maxLength} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={areaRef}
        aria-label="Your answer"
        aria-describedby={countId}
        value={draft}
        maxLength={maxLength}
        disabled={disabled}
        rows={6}
        placeholder="Write your answer"
        onChange={(event) => change(event.target.value)}
        onBlur={flush}
        className={`${fieldClasses} min-h-[9rem] resize-none leading-relaxed`}
      />
      <CharacterCount id={countId} length={draft.length} minLength={minLength} maxLength={maxLength} />
    </div>
  );
}
