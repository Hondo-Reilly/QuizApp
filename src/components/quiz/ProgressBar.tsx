export interface ProgressBarProps {
  current: number;
  total: number;
  answered: number;
}

export function ProgressBar({ current, total, answered }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
        <span>
          Question {current} of {total}
        </span>
        <span>
          {answered} / {total} answered &middot; {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-neutral-800">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
