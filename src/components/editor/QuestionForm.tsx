import { useId } from "react";
import { changeQuestionType } from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import type { Question, QuestionType, QuizImage, Scenario } from "@shared/types";
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
import { ImageField } from "./ImageField";
import { MatchingFields } from "./MatchingFields";
import { NumericFields } from "./NumericFields";
import { OpenFields } from "./OpenFields";
import { RichTextField } from "./RichTextField";

// U+FE0E keeps ☑ as a text symbol instead of an emoji.
export const QUESTION_TYPES: { type: QuestionType; label: string; hint: string; graded: boolean; glyph: string }[] = [
  { type: "true_false", label: "True / False", hint: "One statement, true or false.", graded: true, glyph: "T/F" },
  { type: "multiple_choice", label: "Multiple choice", hint: "Exactly one correct choice.", graded: true, glyph: "A" },
  { type: "multi_answer", label: "Select all", hint: "Every correct choice, and no others.", graded: true, glyph: "☑\uFE0E" },
  { type: "numeric", label: "Number or money", hint: "A typed number within a tolerance.", graded: true, glyph: "12" },
  { type: "matching", label: "Matching", hint: "Items matched to a lettered bank. Partial credit.", graded: true, glyph: "⇄" },
  { type: "short_answer", label: "Short answer", hint: "A word or phrase on one line.", graded: false, glyph: "Aa" },
  { type: "long_answer", label: "Written or code", hint: "A longer answer, or code.", graded: false, glyph: "¶" },
  { type: "image_response", label: "Photo answer", hint: "A photo of work done on paper.", graded: false, glyph: "◩" },
];

export interface QuestionFormProps {
  question: Question;
  index: number;
  total: number;
  scenarios: readonly Scenario[];
  issues: readonly QuizIssue[];
  /** Whether the quiz uses Markdown, which turns on the formatting tools. */
  markdown: boolean;
  /** Picks an image file, adds it to the quiz, and returns it. */
  onAddImage?: () => Promise<QuizImage | null>;
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
  markdown,
  onAddImage,
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
        <RichTextField
          id={`${ids}-prompt`}
          rows={3}
          markdown={markdown}
          value={question.prompt}
          placeholder="What do you want to ask?"
          onAddImage={onAddImage}
          onChange={(prompt) => onChange((q) => ({ ...q, prompt }), "prompt")}
        />
      </EditorField>

      {onAddImage && (
        <ImageField
          label="Question image"
          image={question.image}
          onAddImage={onAddImage}
          onChange={(image) => onChange((q) => ({ ...q, image }))}
        />
      )}

      {question.type === "true_false" && <TrueFalseFields question={question} onChange={onChange} />}
      {(question.type === "multiple_choice" || question.type === "multi_answer") && (
        <ChoiceFields question={question} issues={issues} onChange={onChange} onAddImage={onAddImage} />
      )}
      {question.type === "numeric" && <NumericFields question={question} issues={issues} onChange={onChange} />}
      {question.type === "matching" && (
        <MatchingFields question={question} issues={issues} onChange={onChange} onAddImage={onAddImage} />
      )}
      {open && <OpenFields question={question} issues={issues} markdown={markdown} onChange={onChange} />}

      <EditorField
        label="Explanation"
        htmlFor={`${ids}-explanation`}
        hint="Shown after answering and on review pages."
        issues={issuesAt(issues, "explanation")}
      >
        <RichTextField
          id={`${ids}-explanation`}
          rows={3}
          markdown={markdown}
          value={question.explanation ?? ""}
          onAddImage={onAddImage}
          onChange={(explanation) => onChange((q) => ({ ...q, explanation: explanation || undefined }), "explanation")}
        />
      </EditorField>

      <IssueText issues={issuesAt(issues, "")} />
    </div>
  );
}
