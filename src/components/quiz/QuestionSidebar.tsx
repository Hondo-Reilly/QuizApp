import type { Question, SelfMark, UserAnswer } from "@shared/types";
import { hasAnswer } from "@shared/answers";
import { questionOutcome } from "@shared/grading";
import { useQuizContent } from "@/components/content/QuizContentContext";
import { markdownPreview } from "@/lib/markdownPreview";
import { FlagIcon } from "./FlagButton";

export interface QuestionSidebarProps {
  questions: Question[];
  order: string[];
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  flagged?: Record<string, boolean>;
  /**
   * Revealed answers, in "after each question" mode. Their dots turn green or
   * red; answered but unsubmitted questions stay blue.
   */
  submitted?: Record<string, boolean>;
  /** Self-marks for revealed written and photo answers. */
  selfMarks?: Record<string, SelfMark>;
  onSelect: (index: number) => void;
}

function rowClasses(isCurrent: boolean): string {
  const base =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors";
  if (isCurrent)
    return `${base} bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300`;
  return `${base} text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800`;
}

type QuestionStatus = "unanswered" | "answered" | "correct" | "wrong" | "ungraded";

const STATUS_LABEL: Record<QuestionStatus, string> = {
  unanswered: "Not answered",
  answered: "Answered",
  correct: "Correct",
  wrong: "Incorrect",
  ungraded: "Submitted, not graded",
};

function indicatorClasses(status: QuestionStatus): string {
  const base = "h-2.5 w-2.5 shrink-0 rounded-full";
  switch (status) {
    case "unanswered":
      return `${base} border border-slate-300 dark:border-neutral-600`;
    case "answered":
      return `${base} bg-brand-500`;
    case "correct":
      return `${base} bg-green-500`;
    case "wrong":
      return `${base} bg-red-500`;
    case "ungraded":
      return `${base} bg-violet-400 dark:bg-violet-400`;
  }
}

export function QuestionSidebar({
  questions,
  order,
  currentIndex,
  answers,
  flagged = {},
  submitted = {},
  selfMarks = {},
  onSelect,
}: QuestionSidebarProps) {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const statusOf = (qid: string): QuestionStatus => {
    const answer = answers[qid] ?? null;
    if (!hasAnswer(answer)) return "unanswered";
    const question = questionById.get(qid);
    if (!submitted[qid] || !question) return "answered";
    return questionOutcome(question, answer, selfMarks[qid]);
  };
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
          const status = statusOf(qid);
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
                <span aria-hidden="true" className={indicatorClasses(status)} />
                <span className="sr-only">{STATUS_LABEL[status]}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {promptById.get(qid) ?? `Question ${idx + 1}`}
                </span>
                {flagged[qid] && (
                  <>
                    <FlagIcon filled className="text-amber-500 dark:text-amber-400" />
                    <span className="sr-only">Flagged</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
