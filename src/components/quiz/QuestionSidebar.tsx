import type { Question, UserAnswer } from "@shared/types";
import { hasAnswer } from "@shared/answers";
import { useQuizContent } from "@/components/content/QuizContentContext";
import { markdownPreview } from "@/lib/markdownPreview";

export interface QuestionSidebarProps {
  questions: Question[];
  order: string[];
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  onSelect: (index: number) => void;
}

function rowClasses(isCurrent: boolean): string {
  const base =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors";
  if (isCurrent)
    return `${base} bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300`;
  return `${base} text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800`;
}

function indicatorClasses(answered: boolean): string {
  const base = "h-2.5 w-2.5 shrink-0 rounded-full";
  return answered
    ? `${base} bg-brand-500`
    : `${base} border border-slate-300 dark:border-neutral-600`;
}

export function QuestionSidebar({
  questions,
  order,
  currentIndex,
  answers,
  onSelect,
}: QuestionSidebarProps) {
  const { format } = useQuizContent();
  const promptById = new Map(
    questions.map((q) => [
      q.id,
      format === "markdown" ? markdownPreview(q.prompt) : q.prompt,
    ]),
  );
  const answeredCount = order.reduce(
    (n, id) => (hasAnswer(answers[id] ?? null) ? n + 1 : n),
    0,
  );

  return (
    <div className="sticky top-[4.75rem] self-start max-h-[calc(100vh-6.75rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between px-2 pb-2 pt-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Questions
        </h3>
        <span className="text-xs text-slate-400 dark:text-neutral-500">
          {answeredCount}/{order.length}
        </span>
      </div>
      <ol className="flex flex-col gap-0.5">
        {order.map((qid, idx) => {
          const answered = hasAnswer(answers[qid] ?? null);
          const isCurrent = idx === currentIndex;
          return (
            <li key={qid}>
              <button
                type="button"
                onClick={() => onSelect(idx)}
                className={rowClasses(isCurrent)}
                title={promptById.get(qid)}
              >
                <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500 dark:text-neutral-400">
                  {idx + 1}
                </span>
                <span
                  aria-hidden="true"
                  className={indicatorClasses(answered)}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {promptById.get(qid) ?? `Question ${idx + 1}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
