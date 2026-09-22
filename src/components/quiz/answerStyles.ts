export interface AnswerStyleArgs {
  selected: boolean;
  correct: boolean;
  isCorrectAnswer: boolean;
  reveal: boolean;
  disabled: boolean;
}

export function optionClasses({
  selected,
  isCorrectAnswer,
  reveal,
  disabled,
}: AnswerStyleArgs): string {
  const base =
    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors";

  if (reveal) {
    if (isCorrectAnswer)
      return `${base} border-green-500 bg-green-50 text-green-900 dark:border-green-600 dark:bg-green-950/40 dark:text-green-200`;
    if (selected)
      return `${base} border-red-400 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200`;
    return `${base} border-slate-200 text-slate-600 dark:border-neutral-700 dark:text-neutral-400`;
  }

  if (selected)
    return `${base} border-brand-500 bg-brand-50 text-slate-900 dark:bg-brand-500/10 dark:text-neutral-100`;
  return `${base} border-slate-200 ${disabled ? "" : "hover:bg-slate-50 dark:hover:bg-neutral-800"} text-slate-800 dark:border-neutral-700 dark:text-neutral-200`;
}
