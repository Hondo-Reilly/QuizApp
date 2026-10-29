import { useEffect, useId, useState } from "react";
import { describeIssue, type QuizIssue } from "@shared/quizIssues";
import type { Quiz } from "@shared/types";
import { EditorField, inputClasses, issuesAt, labelClasses } from "./EditorFields";

export interface DetailsFormProps {
  quiz: Quiz;
  issues: readonly QuizIssue[];
  onChange: (change: (quiz: Quiz) => Quiz, key?: string) => void;
  /** Opens the question or field an issue is about. */
  onShowIssue: (issue: QuizIssue) => void;
}

function parseTags(text: string): string[] | undefined {
  const tags = text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/** The quiz's title, description, author, and tags, with every issue that blocks saving. */
export function DetailsForm({ quiz, issues, onChange, onShowIssue }: DetailsFormProps) {
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
      <p className="text-sm text-slate-600 dark:text-neutral-400">
        {quiz.textFormat === "markdown" ? "Text uses Markdown and math." : "Text is plain."}{" "}
        {(quiz.scenarios?.length ?? 0) > 0
          ? `${quiz.scenarios!.length} ${quiz.scenarios!.length === 1 ? "scenario" : "scenarios"}. `
          : ""}
        Editing the text format and scenarios comes in a later update.
      </p>

      <section aria-labelledby={`${ids}-issues`} className="flex flex-col gap-2">
        <h3 id={`${ids}-issues`} className={labelClasses}>
          {issues.length === 0 ? "Ready to save" : `${issues.length} ${issues.length === 1 ? "issue blocks" : "issues block"} saving`}
        </h3>
        {issues.length === 0 ? (
          <p className="text-sm text-green-700 dark:text-green-400">Every question is complete.</p>
        ) : (
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
        )}
      </section>
    </div>
  );
}
