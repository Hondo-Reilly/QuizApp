import { useId } from "react";
import { changeQuestionType } from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import type { Question, QuestionType, Scenario } from "@shared/types";
import { ChoiceFields, TrueFalseFields } from "./ChoiceFields";
import {
  CopyIcon,
  DownIcon,
  EditorField,
  IconButton,
  inputClasses,
  issuesAt,
  IssueText,
  TrashIcon,
  UpIcon,
  type QuestionChange,
} from "./EditorFields";
import { MatchingFields } from "./MatchingFields";
import { NumericFields } from "./NumericFields";

export const QUESTION_TYPES: { type: QuestionType; label: string; hint: string; graded: boolean }[] = [
  { type: "true_false", label: "True / False", hint: "One statement, true or false.", graded: true },
  { type: "multiple_choice", label: "Multiple choice", hint: "Exactly one correct choice.", graded: true },
  { type: "multi_answer", label: "Select all", hint: "Every correct choice, and no others.", graded: true },
  { type: "numeric", label: "Number or money", hint: "A typed number within a tolerance.", graded: true },
  { type: "matching", label: "Matching", hint: "Items matched to a lettered bank. Partial credit.", graded: true },
  { type: "short_answer", label: "Short answer", hint: "A word or phrase on one line.", graded: false },
  { type: "long_answer", label: "Written or code", hint: "A longer answer, or code.", graded: false },
  { type: "image_response", label: "Photo answer", hint: "A photo of work done on paper.", graded: false },
];

export interface QuestionFormProps {
  question: Question;
  index: number;
  total: number;
  scenarios: readonly Scenario[];
  issues: readonly QuizIssue[];
  onChange: QuestionChange;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function QuestionForm({
  question,
  index,
  total,
  scenarios,
  issues,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: QuestionFormProps) {
  const ids = useId();
  const open =
    question.type === "short_answer" || question.type === "long_answer" || question.type === "image_response";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-[16rem]">
          <EditorField label="Question type" htmlFor={`${ids}-type`}>
            <select
              id={`${ids}-type`}
              value={question.type}
              onChange={(event) => onChange((q) => changeQuestionType(q, event.target.value as QuestionType))}
              className={inputClasses}
            >
              {QUESTION_TYPES.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
          </EditorField>
        </div>
        {scenarios.length > 0 && (
          <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-[18rem]">
            <EditorField label="Scenario" htmlFor={`${ids}-scenario`} issues={issuesAt(issues, "scenarioId")}>
              <select
                id={`${ids}-scenario`}
                value={question.scenarioId ?? ""}
                onChange={(event) => onChange((q) => ({ ...q, scenarioId: event.target.value || undefined }))}
                className={inputClasses}
              >
                <option value="">None</option>
                {scenarios.map((scenario, position) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title || `Scenario ${position + 1}`}
                  </option>
                ))}
              </select>
            </EditorField>
          </div>
        )}
        <div className="ml-auto flex">
          <IconButton label="Move question up" disabled={index === 0} onClick={() => onMove(index - 1)}>
            <UpIcon />
          </IconButton>
          <IconButton label="Move question down" disabled={index === total - 1} onClick={() => onMove(index + 1)}>
            <DownIcon />
          </IconButton>
          <IconButton label="Duplicate question" onClick={onDuplicate}>
            <CopyIcon />
          </IconButton>
          <IconButton label="Delete question" onClick={onDelete}>
            <TrashIcon />
          </IconButton>
        </div>
      </div>

      <EditorField label="Prompt" htmlFor={`${ids}-prompt`} issues={issuesAt(issues, "prompt")}>
        <textarea
          id={`${ids}-prompt`}
          rows={3}
          value={question.prompt}
          placeholder="What do you want to ask?"
          onChange={(event) => onChange((q) => ({ ...q, prompt: event.target.value }), "prompt")}
          className={`${inputClasses} resize-y`}
        />
      </EditorField>

      {question.image && (
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Shows the image {question.image.src}. Image editing comes in a later update.
        </p>
      )}

      {question.type === "true_false" && <TrueFalseFields question={question} onChange={onChange} />}
      {(question.type === "multiple_choice" || question.type === "multi_answer") && (
        <ChoiceFields question={question} issues={issues} onChange={onChange} />
      )}
      {question.type === "numeric" && <NumericFields question={question} issues={issues} onChange={onChange} />}
      {question.type === "matching" && <MatchingFields question={question} issues={issues} onChange={onChange} />}
      {open && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          QuizApp doesn&apos;t grade this type. Editing its sample answer, rubric, and limits comes in a
          later update; saving keeps them as they are.
        </p>
      )}

      <EditorField
        label="Explanation"
        htmlFor={`${ids}-explanation`}
        hint="Shown after answering and on review pages."
        issues={issuesAt(issues, "explanation")}
      >
        <textarea
          id={`${ids}-explanation`}
          rows={3}
          value={question.explanation ?? ""}
          onChange={(event) =>
            onChange((q) => ({ ...q, explanation: event.target.value || undefined }), "explanation")
          }
          className={`${inputClasses} resize-y`}
        />
      </EditorField>

      <IssueText issues={issuesAt(issues, "")} />
    </div>
  );
}
