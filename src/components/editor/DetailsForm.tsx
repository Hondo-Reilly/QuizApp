import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { countDollarFields, escapeDollars } from "@shared/quizEdits";
import { describeIssue, type QuizIssue } from "@shared/quizIssues";
import type { Quiz, QuizImage } from "@shared/types";
import { EditorField, inputClasses, issuesAt, labelClasses } from "./EditorFields";
import { ImageField } from "./ImageField";
import { ScenarioFields } from "./ScenarioFields";

export interface DetailsFormProps {
  quiz: Quiz;
  issues: readonly QuizIssue[];
  onChange: (change: (quiz: Quiz) => Quiz, key?: string) => void;
  /** Opens the question or field an issue is about. */
  onShowIssue: (issue: QuizIssue) => void;
  /** Picks an image file, adds it to the quiz, and returns it. */
  onAddImage: () => Promise<QuizImage | null>;
}

function TextFormatField({ quiz, onChange }: Pick<DetailsFormProps, "quiz" | "onChange">) {
  const ids = useId();
  const [confirm, setConfirm] = useState<number | null>(null);
  const markdown = quiz.textFormat === "markdown";
  const turnOn = (escape: boolean) => {
    onChange((q) => ({ ...(escape ? escapeDollars(q) : q), textFormat: "markdown" }));
    setConfirm(null);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${labelClasses} mb-2`}>Text format</legend>
      <div className="flex flex-wrap gap-2">
        {(
          [
            [false, "Plain text"],
            [true, "Markdown and math"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={label}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm ${
              markdown === value
                ? "border-brand-500 bg-brand-50 font-medium dark:bg-brand-500/10"
                : "border-slate-300 dark:border-neutral-700"
            }`}
          >
            <input
              type="radio"
              name={`${ids}-format`}
              checked={markdown === value}
              onChange={() => {
                if (!value) {
                  onChange((q) => ({ ...q, textFormat: undefined }));
                  return;
                }
                const count = countDollarFields(quiz);
                if (count > 0) setConfirm(count);
                else turnOn(false);
              }}
              className="h-4 w-4 accent-brand-500"
            />
            {label}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-neutral-400">
        {markdown
          ? "Bold, code, tables, images in text, and LaTeX math like $x^2$. Text fields get a formatting toolbar."
          : "Text shows exactly as typed. Turn on Markdown for tables, equations, and other formatting."}
      </p>
      <Modal
        open={confirm !== null}
        title="Keep dollar signs as text?"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => turnOn(false)}>
              Leave them
            </Button>
            <Button onClick={() => turnOn(true)}>Keep as text</Button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-neutral-300">
          {confirm === 1 ? "1 field has" : `${confirm} fields have`} a $ sign. With Markdown on, text between two $
          signs becomes math, so prices like $5 and $6 would turn into an equation. Keeping them as text adds a
          backslash before each one (\$), which shows as a plain $.
        </p>
      </Modal>
    </fieldset>
  );
}

function parseTags(text: string): string[] | undefined {
  const tags = text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/** The quiz's title, description, author, and tags, with every issue that blocks saving. */
export function DetailsForm({ quiz, issues, onChange, onShowIssue, onAddImage }: DetailsFormProps) {
  const ids = useId();
  // Tags are typed as one comma-separated line; it is parsed as you type but shown as typed.
  const [tagText, setTagText] = useState(() => (quiz.tags ?? []).join(", "));
  useEffect(() => {
    const parsed = parseTags(tagText) ?? [];
    if (JSON.stringify(parsed) !== JSON.stringify(quiz.tags ?? [])) setTagText((quiz.tags ?? []).join(", "));
    // Only an outside change, such as undo, should rewrite what was typed, so tagText is left out.
  }, [quiz.tags]);

  const text = (field: "title" | "description" | "author") => ({
    value: quiz[field] ?? "",
    onChange: (event: { target: { value: string } }) => {
      const value = event.target.value;
      onChange((q) => ({ ...q, [field]: field === "title" ? value : value || undefined }), field);
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Quiz details</h2>
      <EditorField label="Title" htmlFor={`${ids}-title`} issues={issuesAt(issues, "title")}>
        <input id={`${ids}-title`} type="text" {...text("title")} className={inputClasses} />
      </EditorField>
      <EditorField label="Description" htmlFor={`${ids}-description`} hint="Shown in the Library and on the setup screen.">
        <textarea id={`${ids}-description`} rows={3} {...text("description")} className={`${inputClasses} resize-y`} />
      </EditorField>
      <div className="grid gap-5 sm:grid-cols-2">
        <EditorField label="Author" htmlFor={`${ids}-author`}>
          <input id={`${ids}-author`} type="text" {...text("author")} className={inputClasses} />
        </EditorField>
        <EditorField label="Tags" htmlFor={`${ids}-tags`} hint="Separate tags with commas.">
          <input
            id={`${ids}-tags`}
            type="text"
            value={tagText}
            onChange={(event) => {
              setTagText(event.target.value);
              const tags = parseTags(event.target.value);
              onChange((q) => ({ ...q, tags }), "tags");
            }}
            className={inputClasses}
          />
        </EditorField>
      </div>
      <TextFormatField quiz={quiz} onChange={onChange} />
      <ScenarioFields
        quiz={quiz}
        issues={issues}
        onChange={onChange}
        onAddImage={onAddImage}
        renderImage={(scenario, set) => (
          <ImageField label="Scenario image" image={scenario.image} onAddImage={onAddImage} onChange={set} />
        )}
      />

      {issues.length > 0 && (
        <section aria-labelledby={`${ids}-issues`} className="flex flex-col gap-2">
          <h3 id={`${ids}-issues`} className={labelClasses}>
            {`${issues.length} ${issues.length === 1 ? "issue blocks" : "issues block"} saving`}
          </h3>
          <ul className="flex flex-col gap-1">
            {issues.map((issue) => (
              <li key={`${issue.questionId ?? ""}${issue.field}${issue.message}`}>
                <button
                  type="button"
                  onClick={() => onShowIssue(issue)}
                  className="w-full rounded-md bg-red-50 px-3 py-2 text-left text-sm text-red-900 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                >
                  {describeIssue(quiz, issue)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
