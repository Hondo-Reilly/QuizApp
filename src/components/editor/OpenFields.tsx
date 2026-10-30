import { useEffect, useId, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import {
  DEFAULT_LONG_MAX_LENGTH,
  DEFAULT_MAX_IMAGES,
  DEFAULT_SHORT_MAX_LENGTH,
  MAX_IMAGES_LIMIT,
  MAX_TEXT_LENGTH,
} from "@shared/questionTypes";
import type { QuizIssue } from "@shared/quizIssues";
import type { OpenQuestion, Question } from "@shared/types";
import {
  AddButton,
  EditorField,
  IconButton,
  inputClasses,
  issuesAt,
  IssueText,
  labelClasses,
  RemoveIcon,
  type QuestionChange,
} from "./EditorFields";
import { RichTextField } from "./RichTextField";

/** A whole number that may be left blank, which removes the setting. */
function OptionalCount({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: number | undefined;
  placeholder: string;
  onChange: (value: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  useEffect(() => {
    if (Number(text) !== value && !(text === "" && value === undefined)) {
      setText(value === undefined || Number.isNaN(value) ? "" : String(value));
    }
    // Only a change from elsewhere, such as undo, rewrites what was typed.
  }, [value]);
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        // Not a whole number is kept as NaN, so the form shows it needs fixing.
        onChange(raw.trim() === "" ? undefined : /^\d+$/.test(raw.trim()) ? Number(raw) : Number.NaN);
      }}
      className={inputClasses}
    />
  );
}

/** The sample answer, rubric, and limits of a question QuizApp doesn't grade. */
export function OpenFields({
  question,
  issues,
  markdown,
  onChange,
}: {
  question: OpenQuestion;
  issues: readonly QuizIssue[];
  markdown: boolean;
  onChange: QuestionChange;
}) {
  const ids = useId();
  const edit = (change: (q: OpenQuestion) => Question, key?: string) =>
    onChange(
      (q) => (q.type === "short_answer" || q.type === "long_answer" || q.type === "image_response" ? change(q) : q),
      key,
    );
  const code = question.type === "long_answer" && question.code === true;
  const rubric = question.rubric ?? [];
  const setRubric = (next: string[]) => edit((q) => ({ ...q, rubric: next.length > 0 ? next : undefined }), "rubric");

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
        QuizApp doesn&apos;t grade this type. People compare their answer with the sample answer, or mark it
        themselves, and AI review grades it against the rubric.
      </p>

      {question.type === "long_answer" && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
          <Toggle
            checked={code}
            onChange={(on) => edit((q) => (q.type === "long_answer" ? { ...q, code: on || undefined, language: on ? q.language : undefined } : q))}
            label="Answer in a code editor"
            description="Line numbers, syntax highlighting, and Tab to indent."
          />
          {code && (
            <EditorField label="Language" htmlFor={`${ids}-language`} hint="Leave blank to detect it." issues={issuesAt(issues, "language")}>
              <input
                id={`${ids}-language`}
                type="text"
                value={question.language ?? ""}
                placeholder="python, javascript, sql…"
                onChange={(event) =>
                  edit((q) => (q.type === "long_answer" ? { ...q, language: event.target.value.trim() || undefined } : q), "language")
                }
                className={`${inputClasses} max-w-xs`}
              />
            </EditorField>
          )}
        </div>
      )}

      <EditorField
        label="Sample answer"
        htmlFor={`${ids}-sample`}
        hint="Shown after submitting and on review pages. Write it at the length you expect."
        issues={issuesAt(issues, "sampleAnswer")}
      >
        {code ? (
          <textarea
            id={`${ids}-sample`}
            rows={8}
            spellCheck={false}
            value={question.sampleAnswer ?? ""}
            onChange={(event) => edit((q) => ({ ...q, sampleAnswer: event.target.value || undefined }), "sampleAnswer")}
            className={`${inputClasses} resize-y font-mono text-[13px] sm:text-[13px]`}
          />
        ) : (
          <RichTextField
            id={`${ids}-sample`}
            markdown={markdown}
            value={question.sampleAnswer ?? ""}
            onChange={(sampleAnswer) => edit((q) => ({ ...q, sampleAnswer: sampleAnswer || undefined }), "sampleAnswer")}
          />
        )}
      </EditorField>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={labelClasses}>Rubric</h3>
          <span className="text-xs text-slate-500 dark:text-neutral-400">Points a good answer covers</span>
        </div>
        <ol className="flex flex-col gap-2">
          {rubric.map((point, index) => (
            <li key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-6 text-sm tabular-nums text-slate-500 dark:text-neutral-400">{index + 1}.</span>
                <input
                  type="text"
                  aria-label={`Rubric point ${index + 1}`}
                  value={point}
                  onChange={(event) => setRubric(rubric.map((item, i) => (i === index ? event.target.value : item)))}
                  className={inputClasses}
                />
                <IconButton label={`Remove rubric point ${index + 1}`} onClick={() => setRubric(rubric.filter((_, i) => i !== index))}>
                  <RemoveIcon />
                </IconButton>
              </div>
              <div className="pl-8">
                <IssueText issues={issuesAt(issues, `rubric.${index}`)} />
              </div>
            </li>
          ))}
        </ol>
        <IssueText issues={issuesAt(issues, "rubric")} />
        <AddButton onClick={() => edit((q) => ({ ...q, rubric: [...(q.rubric ?? []), ""] }))}>Add rubric point</AddButton>
      </section>

      {question.type === "image_response" ? (
        <EditorField label="Photos allowed" htmlFor={`${ids}-photos`} issues={issuesAt(issues, "maxImages")}>
          <select
            id={`${ids}-photos`}
            value={question.maxImages ?? DEFAULT_MAX_IMAGES}
            onChange={(event) => {
              const count = Number(event.target.value);
              edit((q) => (q.type === "image_response" ? { ...q, maxImages: count === DEFAULT_MAX_IMAGES ? undefined : count } : q));
            }}
            className={`${inputClasses} max-w-[8rem]`}
          >
            {Array.from({ length: MAX_IMAGES_LIMIT }, (_, i) => i + 1).map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </EditorField>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <EditorField
            label="Minimum characters"
            htmlFor={`${ids}-min`}
            hint="Blank for no minimum."
            issues={issuesAt(issues, "minLength")}
          >
            <OptionalCount
              id={`${ids}-min`}
              value={question.minLength}
              placeholder="0"
              onChange={(minLength) => edit((q) => (q.type === "image_response" ? q : { ...q, minLength }), "minLength")}
            />
          </EditorField>
          <EditorField
            label="Maximum characters"
            htmlFor={`${ids}-max`}
            hint={`Blank for ${(question.type === "short_answer" ? DEFAULT_SHORT_MAX_LENGTH : DEFAULT_LONG_MAX_LENGTH).toLocaleString()}. At most ${MAX_TEXT_LENGTH.toLocaleString()}.`}
            issues={issuesAt(issues, "maxLength")}
          >
            <OptionalCount
              id={`${ids}-max`}
              value={question.maxLength}
              placeholder={String(question.type === "short_answer" ? DEFAULT_SHORT_MAX_LENGTH : DEFAULT_LONG_MAX_LENGTH)}
              onChange={(maxLength) => edit((q) => (q.type === "image_response" ? q : { ...q, maxLength }), "maxLength")}
            />
          </EditorField>
        </div>
      )}
    </div>
  );
}
