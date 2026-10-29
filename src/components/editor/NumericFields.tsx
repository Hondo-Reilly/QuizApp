import { useEffect, useId, useRef, useState } from "react";
import {
  currencySymbol,
  formatNumeric,
  isCurrencyCode,
  isNumericCorrect,
  parseNumericAnswer,
  toleranceOf,
} from "@shared/numeric";
import type { QuizIssue } from "@shared/quizIssues";
import type { NumericQuestion, Question } from "@shared/types";
import { EditorField, inputClasses, issuesAt, labelClasses, type QuestionChange } from "./EditorFields";

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN"];

function currencyCodes(): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  const all = supported ? supported("currency") : [];
  const rest = all.filter((code) => !COMMON_CURRENCIES.includes(code) && isCurrencyCode(code));
  return [...COMMON_CURRENCIES, ...rest];
}

type Format = "plain" | "unit" | "money";

function formatOf(question: NumericQuestion): Format {
  if (question.currency !== undefined) return "money";
  return question.unit !== undefined ? "unit" : "plain";
}

/**
 * A number typed as text. It keeps what the author typed, even when that isn't
 * a number yet, and follows the value when it changes elsewhere, as on undo.
 */
function NumberText({
  id,
  value,
  question,
  onChange,
  emptyValue,
  placeholder,
}: {
  id: string;
  value: number | undefined;
  question: NumericQuestion;
  onChange: (value: number | undefined) => void;
  /** What an empty box means: undefined to remove the field, NaN when it is required. */
  emptyValue: number | undefined;
  placeholder?: string;
}) {
  const show = (number: number | undefined) =>
    number === undefined || Number.isNaN(number) ? "" : String(number);
  const [text, setText] = useState(() => show(value));
  const last = useRef(value);
  useEffect(() => {
    if (!Object.is(value, last.current)) setText(show(value));
    last.current = value;
  }, [value]);
  const prefix = question.currency ? currencySymbol(question.currency) : null;

  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900">
      {prefix && (
        <span className="flex items-center border-r border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          const next = raw.trim() === "" ? emptyValue : (parseNumericAnswer(raw, question) ?? Number.NaN);
          last.current = next;
          onChange(next);
        }}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base tabular-nums text-slate-900 focus:outline-none sm:text-sm dark:text-neutral-100"
      />
      {question.unit && (
        <span className="flex items-center border-l border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {question.unit}
        </span>
      )}
    </div>
  );
}

function acceptedRange(question: NumericQuestion): string | null {
  if (!Number.isFinite(question.answer)) return null;
  const tolerance = toleranceOf(question);
  if (!Number.isFinite(tolerance) || tolerance < 0) return null;
  if (tolerance === 0) return `Accepts exactly ${formatNumeric(question.answer, question)}`;
  return `Accepts ${formatNumeric(question.answer - tolerance, question)} to ${formatNumeric(question.answer + tolerance, question)}`;
}

export function NumericFields({
  question,
  issues,
  onChange,
}: {
  question: NumericQuestion;
  issues: readonly QuizIssue[];
  onChange: QuestionChange;
}) {
  const ids = useId();
  const [trial, setTrial] = useState("");
  const edit = (change: (q: NumericQuestion) => Question, key?: string) =>
    onChange((q) => (q.type === "numeric" ? change(q) : q), key);
  const format = formatOf(question);
  const setFormat = (next: Format) =>
    edit((q) => {
      if (next === "money") return { ...q, currency: q.currency ?? "USD", unit: undefined };
      if (next === "unit") return { ...q, currency: undefined, unit: q.unit ?? "" };
      return { ...q, currency: undefined, unit: undefined };
    });
  const range = acceptedRange(question);
  const trialResult =
    trial.trim() === ""
      ? null
      : parseNumericAnswer(trial, question) === null
        ? { tone: "text-amber-700 dark:text-amber-400", text: "Not a number" }
        : isNumericCorrect(question, trial)
          ? { tone: "text-green-700 dark:text-green-400", text: "Correct" }
          : { tone: "text-red-700 dark:text-red-400", text: "Marked wrong" };

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className={`${labelClasses} mb-2`}>Answer format</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["plain", "Plain number"],
              ["unit", "With a unit"],
              ["money", "Money"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm ${
                format === value
                  ? "border-brand-500 bg-brand-50 font-medium dark:bg-brand-500/10"
                  : "border-slate-300 dark:border-neutral-700"
              }`}
            >
              <input
                type="radio"
                name={`format-${question.id}`}
                checked={format === value}
                onChange={() => setFormat(value)}
                className="h-4 w-4 accent-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        {format === "money" && (
          <EditorField label="Currency" htmlFor={`${ids}-currency`} issues={issuesAt(issues, "currency")}>
            <select
              id={`${ids}-currency`}
              value={question.currency}
              onChange={(event) => edit((q) => ({ ...q, currency: event.target.value }))}
              className={inputClasses}
            >
              {currencyCodes().map((code) => (
                <option key={code} value={code}>
                  {code} ({currencySymbol(code)})
                </option>
              ))}
            </select>
          </EditorField>
        )}
        {format === "unit" && (
          <EditorField label="Unit" htmlFor={`${ids}-unit`} issues={issuesAt(issues, "unit")}>
            <input
              id={`${ids}-unit`}
              type="text"
              value={question.unit ?? ""}
              placeholder="mm, °, MHz…"
              maxLength={20}
              onChange={(event) => edit((q) => ({ ...q, unit: event.target.value }), "unit")}
              className={inputClasses}
            />
          </EditorField>
        )}
        <EditorField label="Correct answer" htmlFor={`${ids}-answer`} issues={issuesAt(issues, "answer")}>
          <NumberText
            id={`${ids}-answer`}
            value={question.answer}
            question={question}
            emptyValue={Number.NaN}
            onChange={(answer) => edit((q) => ({ ...q, answer: answer ?? Number.NaN }), "answer")}
          />
        </EditorField>
        <EditorField label="Tolerance (±)" htmlFor={`${ids}-tolerance`} issues={issuesAt(issues, "tolerance")}>
          <NumberText
            id={`${ids}-tolerance`}
            value={question.tolerance}
            question={question}
            emptyValue={undefined}
            placeholder="0 (exact)"
            onChange={(tolerance) => edit((q) => ({ ...q, tolerance }), "tolerance")}
          />
        </EditorField>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
        {range && <div className="text-sm text-slate-800 dark:text-neutral-200">{range}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`${ids}-trial`} className="text-sm text-slate-600 dark:text-neutral-400">
            Test an answer
          </label>
          <input
            id={`${ids}-trial`}
            type="text"
            inputMode="decimal"
            value={trial}
            onChange={(event) => setTrial(event.target.value)}
            className={`${inputClasses} max-w-[10rem]`}
          />
          {trialResult && (
            <span role="status" className={`text-sm font-semibold ${trialResult.tone}`}>
              {trialResult.text}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 dark:text-neutral-400">
          People may type commas, the currency symbol, or scientific notation.
        </span>
      </div>
    </div>
  );
}
