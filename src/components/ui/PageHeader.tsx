import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  as?: "div" | "header";
  spacing?: "default" | "roomy";
}

export function PageHeader({
  title,
  subtitle,
  actions,
  as: Tag = "div",
  spacing = "default",
}: PageHeaderProps) {
  return (
    <Tag
      className={`${spacing === "roomy" ? "mb-8" : "mb-6"} flex items-start justify-between gap-4`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-neutral-100">
          {title}
        </h1>
        {subtitle && (
          <p
            className={`${spacing === "roomy" ? "mt-2" : "mt-1"} text-sm text-slate-500 dark:text-neutral-400`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </Tag>
  );
}
