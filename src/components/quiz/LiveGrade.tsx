export interface LiveGradeProps {
  correct: number;
  /** Revealed questions with a result; ungraded written answers are left out. */
  graded: number;
}

/** The score so far in an "after each question" quiz. */
export function LiveGrade({ correct, graded }: LiveGradeProps) {
  const percent = graded === 0 ? null : Math.round((correct / graded) * 100);
  return (
    <div
      className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      role="status"
      aria-label={
        percent === null
          ? "Score so far: nothing graded yet"
          : `Score so far: ${correct} of ${graded} correct, ${percent} percent`
      }
    >
      {percent === null ? "–" : `${correct}/${graded} · ${percent}%`}
    </div>
  );
}
