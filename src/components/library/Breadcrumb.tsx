import { Link } from "react-router-dom";
import { useQuizDrop, type DraggedQuiz } from "@/lib/quizDrag";
import type { Folder } from "@shared/types";

export interface BreadcrumbProps {
  path: Folder[];
  onDropQuiz: (quiz: DraggedQuiz, folderId: string | null) => void;
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

export function Breadcrumb({ path, onDropQuiz }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Library path"
      className="flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-neutral-400"
    >
      <DropLink to="/" folderId={null} onDropQuiz={onDropQuiz}>
        Library
      </DropLink>
      {path.map((folder, idx) => {
        const isLast = idx === path.length - 1;
        return (
          <span key={folder.id} className="flex items-center gap-1">
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
