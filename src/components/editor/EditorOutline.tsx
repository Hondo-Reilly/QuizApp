import { useState } from "react";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { markdownPreview } from "@/lib/markdownPreview";
import { questionTypeLabel } from "@shared/questionTypes";
import { moveTargetForSlot } from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import { textFormatOf } from "@shared/quizContent";
import type { Quiz } from "@shared/types";
import { DETAILS } from "@/state/editorStore";
import { labelClasses, PencilIcon, PlusIcon } from "./EditorFields";

export interface EditorOutlineProps {
  quiz: Quiz;
  issues: readonly QuizIssue[];
  selected: string;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd: () => void;
  onDuplicate: (questionId: string) => void;
  onDelete: (questionId: string) => void;
}

function rowClasses(selected: boolean): string {
  const base =
    "flex w-full min-h-11 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
  return selected
    ? `${base} bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300 dark:bg-brand-500/15 dark:text-brand-300`
    : `${base} text-slate-800 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800`;
}

const IssueDot = ({ label }: { label: string }) => (
  <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" role="img" aria-label={label} />
);

/** Where a dragged question will land: a line in the gap between two rows. */
const DropLine = ({ edge }: { edge: "top" | "bottom" }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute inset-x-1 z-10 flex items-center ${
      edge === "top" ? "-top-px -translate-y-1/2" : "-bottom-px translate-y-1/2"
    }`}
  >
    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
    <span className="h-0.5 flex-1 bg-brand-500" />
  </span>
);

/** The quiz details and the questions, in order. Drag a question to move it. */
export function EditorOutline({
  quiz,
  issues,
  selected,
  onSelect,
  onMove,
  onAdd,
  onDuplicate,
  onDelete,
}: EditorOutlineProps) {
  // The right-click menu of one question row.
  const [menu, setMenu] = useState<{ x: number; y: number; questionId: string } | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // The gap the dragged question would drop into: 0 is above the first, n below the last.
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const endDrag = () => {
    setDragFrom(null);
    setDropSlot(null);
  };
  // A drop that wouldn't move the question shows no line.
  const lineAt = dragFrom !== null && dropSlot !== null && moveTargetForSlot(dragFrom, dropSlot) !== null ? dropSlot : null;
  const markdown = textFormatOf(quiz) === "markdown";
  const detailsIssues = issues.filter((issue) => !issue.questionId).length;
  const questionsWithIssues = new Set(issues.map((issue) => issue.questionId).filter(Boolean));
  const scenarioTitle = new Map((quiz.scenarios ?? []).map((scenario, index) => [scenario.id, scenario.title || `Scenario ${index + 1}`]));

  return (
    <nav aria-label="Questions" className="flex flex-col gap-1">
      <button type="button" onClick={() => onSelect(DETAILS)} className={rowClasses(selected === DETAILS)}>
        <span className="flex-1 text-sm font-medium">Quiz details</span>
        {detailsIssues > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
            {detailsIssues} {detailsIssues === 1 ? "issue" : "issues"}
          </span>
        )}
        <span className="shrink-0 text-slate-500 dark:text-neutral-400">
          <PencilIcon />
        </span>
      </button>
      <div className="flex items-baseline justify-between px-2 pb-1 pt-3">
        <span className={labelClasses}>Questions</span>
        <span className="text-xs text-slate-500 dark:text-neutral-400">{quiz.questions.length}</span>
      </div>
      <ol
        className="flex flex-col gap-0.5"
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSlot(null);
        }}
      >
        {quiz.questions.map((question, index) => {
          const preview = (markdown ? markdownPreview(question.prompt) : question.prompt).trim();
          const scenario = question.scenarioId ? scenarioTitle.get(question.scenarioId) : undefined;
          return (
            <li
              key={question.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", question.id);
                setDragFrom(index);
              }}
              onDragOver={(event) => {
                if (dragFrom === null) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const rect = event.currentTarget.getBoundingClientRect();
                const slot = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
                if (slot !== dropSlot) setDropSlot(slot);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const to = dragFrom !== null && dropSlot !== null ? moveTargetForSlot(dragFrom, dropSlot) : null;
                if (dragFrom !== null && to !== null) onMove(dragFrom, to);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={`relative rounded-md ${dragFrom === index ? "opacity-50" : ""}`}
            >
              {lineAt === index && <DropLine edge="top" />}
              {lineAt === index + 1 && index === quiz.questions.length - 1 && <DropLine edge="bottom" />}
              <button
                type="button"
                onClick={() => onSelect(question.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  // The keyboard's menu key reports no pointer position, so use the row's corner.
                  const rect = event.currentTarget.getBoundingClientRect();
                  const fromKeyboard = event.clientX === 0 && event.clientY === 0;
                  setMenu({
                    x: fromKeyboard ? rect.left + 16 : event.clientX,
                    y: fromKeyboard ? rect.bottom : event.clientY,
                    questionId: question.id,
                  });
                }}
                className={rowClasses(selected === question.id)}
              >
                <span aria-hidden="true" className="cursor-grab text-slate-400 dark:text-neutral-500">
                  ⋮⋮
                </span>
                <span className="w-5 shrink-0 text-center text-xs tabular-nums text-slate-500 dark:text-neutral-400">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-sm ${preview ? "" : "italic text-slate-500 dark:text-neutral-400"}`}>
                    {preview || "Untitled question"}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-neutral-400">
                    {questionTypeLabel(question)}
                    {scenario ? ` · ${scenario}` : ""}
                  </span>
                </span>
                {questionsWithIssues.has(question.id) && <IssueDot label="Has issues" />}
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-400 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <PlusIcon />
        Add question
      </button>
      <ContextMenu
        position={menu}
        label="Question actions"
        onClose={() => setMenu(null)}
        items={
          menu
            ? [
                { label: "Duplicate", onSelect: () => onDuplicate(menu.questionId) },
                { label: "Delete", onSelect: () => onDelete(menu.questionId) },
              ]
            : []
        }
      />
    </nav>
  );
}
