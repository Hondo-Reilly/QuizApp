import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuizDrop, type DraggedQuiz } from "@/lib/quizDrag";
import type { Folder } from "@shared/types";

export interface BreadcrumbProps {
  path: Folder[];
  onDropQuiz: (quiz: DraggedQuiz, folderId: string | null) => void;
  /** Keeps the path on one line that scrolls sideways, showing the current folder. */
  singleLine?: boolean;
}

const linkClass =
  "rounded px-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

function DropLink({
  to,
  folderId,
  onDropQuiz,
  children,
}: {
  to: string;
  folderId: string | null;
  onDropQuiz: (quiz: DraggedQuiz, folderId: string | null) => void;
  children: string;
}) {
  const { over, dropProps } = useQuizDrop((quiz) => onDropQuiz(quiz, folderId));
  return (
    <Link
      to={to}
      className={`${linkClass} ${over ? "bg-brand-50 text-slate-900 ring-2 ring-brand-500 dark:bg-neutral-800 dark:text-neutral-100" : ""}`}
      {...dropProps}
    >
      {children}
    </Link>
  );
}

export function Breadcrumb({ path, onDropQuiz, singleLine = false }: BreadcrumbProps) {
  const navRef = useRef<HTMLElement>(null);
  const currentId = path[path.length - 1]?.id;

  useEffect(() => {
    const nav = navRef.current;
    if (singleLine && nav) nav.scrollLeft = nav.scrollWidth;
  }, [singleLine, currentId]);

  return (
    <nav
      ref={navRef}
      aria-label="Library path"
      className={`flex items-center gap-1 text-sm text-slate-600 dark:text-neutral-400 ${singleLine ? "overflow-x-auto whitespace-nowrap [scrollbar-width:none]" : "flex-wrap"}`}
    >
      <DropLink to="/" folderId={null} onDropQuiz={onDropQuiz}>
        Library
      </DropLink>
      {path.map((folder, idx) => {
        const isLast = idx === path.length - 1;
        return (
          <span key={folder.id} className="flex shrink-0 items-center gap-1">
            <span aria-hidden="true" className="text-slate-400 dark:text-neutral-600">
              /
            </span>
            {isLast ? (
              <span className="font-medium text-slate-900 dark:text-neutral-100">
                {folder.name}
              </span>
            ) : (
              <DropLink
                to={`/folder/${folder.id}`}
                folderId={folder.id}
                onDropQuiz={onDropQuiz}
              >
                {folder.name}
              </DropLink>
            )}
          </span>
        );
      })}
    </nav>
  );
}
