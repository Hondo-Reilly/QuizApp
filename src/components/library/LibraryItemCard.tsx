import type { DragEvent, DragEventHandler, ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export interface LibraryItemCardProps {
  variant: "folder" | "quiz";
  title: string;
  description?: string;
  icon?: ReactNode;
  metadata: ReactNode;
  actions: ReactNode;
  onOpen: () => void;
  draggable?: boolean;
  dragging?: boolean;
  dropActive?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
}

export function LibraryItemCard({
  variant,
  title,
  description,
  icon,
  metadata,
  actions,
  onOpen,
  draggable = false,
  dragging = false,
  dropActive = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: LibraryItemCardProps) {
  const heading = (
    <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
      {title}
    </h3>
  );

  return (
    <Card
      draggable={draggable}
      onDragStart={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-no-drag]")) {
          event.preventDefault();
          return;
        }
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        event.dataTransfer.setDragImage(
          card,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        onDragStart?.(event);
      }}
      onDragEnd={onDragEnd as DragEventHandler<HTMLDivElement>}
      onDragOver={onDragOver as DragEventHandler<HTMLDivElement>}
      onDragLeave={onDragLeave as DragEventHandler<HTMLDivElement>}
      onDrop={onDrop as DragEventHandler<HTMLDivElement>}
      aria-grabbed={draggable ? dragging : undefined}
      className={`flex flex-col gap-3 ${draggable ? "cursor-grab select-none active:cursor-grabbing" : ""} ${dragging ? "opacity-60" : ""} ${dropActive ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-neutral-800" : ""}`}
    >
      <button
        type="button"
        draggable={false}
        onDragOver={onDragOver as DragEventHandler<HTMLButtonElement>}
        onDragLeave={onDragLeave as DragEventHandler<HTMLButtonElement>}
        onDrop={onDrop as DragEventHandler<HTMLButtonElement>}
        onClick={onOpen}
        className={
          variant === "folder"
            ? "flex flex-1 flex-col gap-2 text-left"
            : "flex flex-1 cursor-grab flex-col text-left active:cursor-grabbing"
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
      <div data-no-drag className="flex items-center justify-end gap-2">
        {actions}
      </div>
    </Card>
  );
}
