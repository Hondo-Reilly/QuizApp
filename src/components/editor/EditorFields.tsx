import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { QuizIssue } from "@shared/quizIssues";
import type { Question } from "@shared/types";

/** The edit a form hands back: how to change its question, and the field it came from. */
export type QuestionChange = (change: (question: Question) => Question, key?: string) => void;

export const labelClasses =
  "text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-400";

export const inputClasses =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

/** Issues on exactly this field. */
export function issuesAt(issues: readonly QuizIssue[], field: string): QuizIssue[] {
  return issues.filter((issue) => issue.field === field);
}

/** Issues on this field or anything inside it, e.g. "choices" and "choices.1.text". */
export function issuesWithin(issues: readonly QuizIssue[], field: string): QuizIssue[] {
  return issues.filter((issue) => issue.field === field || issue.field.startsWith(`${field}.`));
}

export function IssueText({ issues }: { issues: readonly QuizIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="flex flex-col gap-0.5">
      {issues.map((issue) => (
        <li key={issue.field + issue.message} className="text-xs text-red-700 dark:text-red-400">
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

export function EditorField({
  label,
  htmlFor,
  hint,
  issues = [],
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  issues?: readonly QuizIssue[];
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-slate-500 dark:text-neutral-400">{hint}</span>}
      <IssueText issues={issues} />
    </div>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 disabled:hover:bg-transparent dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const RemoveIcon = () => (
  <svg {...iconProps}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const UpIcon = () => (
  <svg {...iconProps}>
    <path d="M18 15l-6-6-6 6" />
  </svg>
);
export const DownIcon = () => (
  <svg {...iconProps}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);
export const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const ImageIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 17l-5-5-9 8" />
  </svg>
);

export function AddButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md border border-dashed border-slate-400 px-3 text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <PlusIcon />
      {children}
    </button>
  );
}
