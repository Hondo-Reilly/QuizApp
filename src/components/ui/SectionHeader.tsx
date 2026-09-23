import type { ReactNode } from "react";

export interface SectionHeaderProps {
  title: string;
  actions?: ReactNode;
}

const titleClass =
  "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400";

export function SectionHeader({ title, actions }: SectionHeaderProps) {
  if (!actions) {
    return <h2 className={`mb-3 ${titleClass}`}>{title}</h2>;
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className={titleClass}>{title}</h2>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {actions}
      </div>
    </div>
  );
}
