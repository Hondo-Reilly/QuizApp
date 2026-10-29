import { useId } from "react";
import { ChoiceContent } from "@/components/content/ChoiceContent";
import { RichText } from "@/components/content/RichText";
import { useQuizContent } from "@/components/content/QuizContentContext";
import { markdownPreview } from "@/lib/markdownPreview";
import { letteredChoices, matchesOf, withMatch } from "@shared/matching";
import type { MatchAnswer, MatchingQuestion, UserAnswer } from "@shared/types";
import { orderChoices } from "./orderChoices";

export interface MatchingInputProps {
  question: MatchingQuestion;
  value: UserAnswer;
  onChange: (value: MatchAnswer | null) => void;
  reveal: boolean;
  disabled: boolean;
  choiceOrder?: readonly string[];
}

const selectClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-50 disabled:text-slate-600 sm:w-48 md:w-full xl:w-48 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:disabled:bg-neutral-900/60 dark:disabled:text-neutral-300";

function rowTone(reveal: boolean, right: boolean): string {
  if (!reveal) return "border-slate-200 dark:border-neutral-800";
  return right
    ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/40"
    : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40";
}

// Beside the bank, a row is too narrow for text and drop-down side by side until xl.
/** Concepts on one side, each matched by drop-down to a lettered statement in the choice bank. */
export function MatchingInput({ question, value, onChange, reveal, disabled, choiceOrder }: MatchingInputProps) {
  const bankId = useId();
  const { format } = useQuizContent();
  const bank = letteredChoices(orderChoices(question.choices, choiceOrder));
  const letterOf = new Map(bank.map((choice) => [choice.id, choice.letter]));
  const matches = matchesOf(value);
  const usedBy = new Map<string, string>();
  for (const [itemId, choiceId] of Object.entries(matches)) usedBy.set(choiceId, itemId);
  const optionText = (text: string) => {
    const plain = format === "markdown" ? markdownPreview(text) : text.trim();
    return plain.length > 70 ? `${plain.slice(0, 69)}…` : plain;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Concept / term
        </div>
        <ol className="flex flex-col gap-2">
          {question.items.map((item, index) => {
            const picked = matches[item.id] ?? "";
            const right = picked === item.answer;
            return (
              <li
                key={item.id}
                className={`flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between md:flex-col md:items-stretch xl:flex-row xl:items-center ${rowTone(reveal, right)}`}
              >
                <div className="flex min-w-0 gap-1.5 text-sm text-slate-800 dark:text-neutral-200">
                  <span className="shrink-0 font-medium tabular-nums">{index + 1}.</span>
                  <RichText text={item.text} inline className="min-w-0" />
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:items-end md:items-stretch xl:items-end">
                  <select
                    aria-label={`Match for ${index + 1}`}
                    aria-describedby={bankId}
                    value={picked}
                    disabled={disabled}
                    onChange={(event) => onChange(withMatch(question, value, item.id, event.target.value))}
                    className={selectClasses}
                  >
                    <option value="">Choose…</option>
                    {/* A choice used once leaves every other item's list until it is cleared. */}
                    {bank
                      .filter(
                        (choice) =>
                          question.reuseChoices || !usedBy.has(choice.id) || usedBy.get(choice.id) === item.id,
                      )
                      .map((choice) => {
                        const text = optionText(choice.text);
                        return (
                          <option key={choice.id} value={choice.id}>
                            {choice.letter}
                            {text ? `. ${text}` : ""}
                          </option>
                        );
                      })}
                  </select>
                  {reveal && !right && (
                    <span className="text-xs font-medium text-green-800 dark:text-green-300">
                      Answer: {letterOf.get(item.answer) ?? item.answer}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Choice bank
          </div>
          <div id={bankId} className="text-xs text-slate-500 dark:text-neutral-400">
            {question.reuseChoices ? "A choice may be used more than once" : "Each choice is used once"}
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5 dark:border-neutral-800">
          {bank.map((choice) => {
            const used = !question.reuseChoices && usedBy.has(choice.id);
            return (
              <li
                key={choice.id}
                className={`flex gap-2 text-sm text-slate-800 dark:text-neutral-200 ${used && !reveal ? "opacity-50" : ""}`}
              >
                <span className="w-6 shrink-0 font-semibold">{choice.letter}.</span>
                <span className="min-w-0 flex-1">
                  <ChoiceContent choice={choice} />
                </span>
                {used && !reveal && <span className="sr-only">(used)</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
