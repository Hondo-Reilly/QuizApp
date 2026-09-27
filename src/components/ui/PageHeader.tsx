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
      className={`${spacing === "roomy" ? "mb-6 sm:mb-8" : "mb-5 sm:mb-6"} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-xl font-semibold sm:text-2xl tracking-tight text-slate-900 dark:text-neutral-100">
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
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
          {actions}
        </div>
      )}
    </Tag>
  );
}
