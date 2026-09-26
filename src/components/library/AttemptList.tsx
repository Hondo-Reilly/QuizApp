import { useEffect, useMemo, useRef, useState } from "react";
import { FlagIcon } from "@/components/quiz/FlagButton";
import { Button } from "@/components/ui/Button";
import { downloadAttemptExport } from "@/lib/exportAttempt";
import type { Quiz, QuizAttempt } from "@shared/types";

export interface AttemptListProps {
  quiz: Quiz;
  attempts: QuizAttempt[];
  onOpen: (attempt: QuizAttempt) => void;
  onDelete: (ids: string[]) => Promise<void>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const checkboxClass =
  "h-4 w-4 rounded border-slate-300 accent-brand-500 dark:border-neutral-600";

export function AttemptList({ quiz, attempts, onOpen, onDelete }: AttemptListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => attempts.map((attempt) => attempt.id).filter((id) => selected.has(id)),
    [attempts, selected],
  );
  const allSelected = attempts.length > 0 && selectedIds.length === attempts.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  if (attempts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-neutral-400">
        No attempts yet.
      </p>
    );
  }

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(attempts.map((attempt) => attempt.id)));
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const message =
      count === 1
        ? "Delete this attempt? This cannot be undone."
        : `Delete ${count} attempts? This cannot be undone.`;
    if (!confirm(message)) return;
    setDeleting(true);
    try {
      await onDelete(selectedIds);
      setSelected(new Set());
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center border-b border-slate-200 dark:border-neutral-800">
        <label className="flex shrink-0 cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-neutral-200">
          <input
            ref={selectAllRef}
            type="checkbox"
            aria-label="Select all attempts"
            checked={allSelected}
            onChange={toggleAll}
            className={checkboxClass}
          />
          Select all
        </label>
        <div className="ml-auto flex items-center gap-2 px-4 py-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={selectedIds.length === 0}
            className="disabled:!border-0 disabled:!bg-slate-100 disabled:!text-slate-400 dark:disabled:!bg-neutral-800 dark:disabled:!text-neutral-500"
            onClick={() => {
              const chosen = new Set(selectedIds);
              setExportError(null);
              downloadAttemptExport(
                quiz,
                attempts.filter((attempt) => chosen.has(attempt.id)),
                false,
              ).catch((err: unknown) =>
                setExportError(
                  `Could not export. ${err instanceof Error ? err.message : ""}`.trim(),
                ),
              );
            }}
          >
            Export selected
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || selectedIds.length === 0}
            className="disabled:!bg-slate-100 disabled:!text-slate-400 dark:disabled:!bg-neutral-800 dark:disabled:!text-neutral-500"
          >
            Delete selected
          </Button>
        </div>
      </div>
      {exportError && (
        <p className="border-b border-slate-200 px-4 py-2 text-sm text-red-600 dark:border-neutral-800 dark:text-red-400">
          {exportError}
        </p>
      )}
      <ul>
        {attempts.map((attempt) => (
          <li
            key={attempt.id}
            className="flex items-center border-b border-slate-200 last:border-b-0 hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
          >
            <label className="flex shrink-0 cursor-pointer items-center self-stretch px-4">
              <input
                type="checkbox"
                aria-label={`Select attempt from ${formatDate(attempt.completedAt)}`}
                checked={selected.has(attempt.id)}
                onChange={() => toggle(attempt.id)}
                className={checkboxClass}
              />
            </label>
            <button
              type="button"
              onClick={() => onOpen(attempt)}
              className="flex min-w-0 flex-1 items-center justify-between gap-4 py-3 pr-4 text-left text-sm"
            >
              <span className="text-slate-700 dark:text-neutral-200">
                {formatDate(attempt.completedAt)}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                {(attempt.flagged?.length ?? 0) > 0 && (
                  <>
                    <FlagIcon filled />
                    {attempt.flagged!.length} flagged
                  </>
                )}
              </span>
              {(attempt.ungraded ?? 0) > 0 && (
                <span className="shrink-0 text-xs text-violet-700 dark:text-violet-300">
                  {attempt.ungraded} not graded
                </span>
              )}
              <span className="shrink-0 tabular-nums text-slate-600 dark:text-neutral-300">
                {attempt.correct}/{attempt.total} correct
              </span>
              <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                {attempt.total > 0 ? `${attempt.percent}%` : "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
