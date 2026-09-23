import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export interface LibraryItemCardProps {
  variant: "folder" | "quiz";
  title: string;
  description?: string;
  icon?: ReactNode;
  metadata: ReactNode;
  actions: ReactNode;
  onOpen: () => void;
}

export function LibraryItemCard({
  variant,
  title,
  description,
  icon,
  metadata,
  actions,
  onOpen,
}: LibraryItemCardProps) {
  const heading = (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
      {title}
    </h3>
  );

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onOpen}
        className={
          variant === "folder"
            ? "flex flex-1 flex-col gap-2 text-left"
            : "flex flex-1 flex-col text-left"
        }
      >
        {icon ? (
          <div className="flex items-center gap-2">
            {icon}
            {heading}
          </div>
        ) : (
          heading
        )}
        {description && (
          <p
            className={`${variant === "quiz" ? "mt-1 " : ""}line-clamp-2 text-sm text-slate-600 dark:text-neutral-400`}
          >
            {description}
          </p>
        )}
        <div
          className={
            variant === "folder"
              ? "text-xs text-slate-500 dark:text-neutral-400"
              : "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-neutral-400"
          }
        >
          {metadata}
        </div>
      </button>
      <div className="flex items-center justify-end gap-2">{actions}</div>
    </Card>
  );
}
