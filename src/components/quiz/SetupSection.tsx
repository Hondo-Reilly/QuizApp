import type { ReactNode } from "react";

export function SetupSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2
        className={`text-sm font-semibold text-slate-700 dark:text-neutral-300 ${hint ? "mb-1" : "mb-2"}`}
      >
        {title}
      </h2>
      {hint ? (
        <p className="mb-2 text-xs text-slate-500 dark:text-neutral-400">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}
