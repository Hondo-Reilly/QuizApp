export interface FlagButtonProps {
  flagged: boolean;
  onToggle: () => void;
  /** Hides the text label and shows only the icon. */
  compact?: boolean;
}

export function FlagIcon({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M3.5 14.5V2" strokeLinecap="round" />
      <path d="M3.5 2.5h8.2l-1.9 3 1.9 3H3.5" />
    </svg>
  );
}

/** Marks a question to study later, whether or not it was answered correctly. */
export function FlagButton({ flagged, onToggle, compact = false }: FlagButtonProps) {
  const label = flagged ? "Flagged to study" : "Flag to study";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={flagged}
      aria-label={compact ? label : undefined}
      title={`${label} (F)`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        flagged
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
      }`}
    >
      <FlagIcon filled={flagged} />
      {/* The label never changes, so toggling never reflows the question text. */}
      {!compact && <span>Flag</span>}
    </button>
  );
}
