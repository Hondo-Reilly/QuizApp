import { SELF_MARK_LABEL, SELF_MARKS } from "@shared/selfMarks";
import type { SelfMark } from "@shared/types";

const TONE: Record<SelfMark, string> = {
  got: "border-green-400 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300",
  missed: "border-red-400 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
  unsure: "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export interface SelfMarkControlProps {
  value: SelfMark | undefined;
  onChange: (mark: SelfMark | null) => void;
}

/** "I got it", "I missed it", or "I'm not sure" for a written or photo answer. */
export function SelfMarkControl({ value, onChange }: SelfMarkControlProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-400">
        Compare with the sample answer
      </span>
      <div role="radiogroup" aria-label="Mark your answer" className="flex flex-wrap gap-2">
        {SELF_MARKS.map((mark) => {
          const selected = value === mark;
          return (
            <button
              key={mark}
              type="button"
              role="radio"
              aria-checked={selected}
              // Choosing the selected mark again clears it.
              onClick={() => onChange(selected ? null : mark)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                selected
                  ? TONE[mark]
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {SELF_MARK_LABEL[mark]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
