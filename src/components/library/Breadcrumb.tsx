import { Link } from "react-router-dom";
import type { Folder } from "@shared/types";

export interface BreadcrumbProps {
  path: Folder[];
}

export function Breadcrumb({ path }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Library path"
      className="flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-neutral-400"
    >
      <Link
        to="/"
        className="rounded px-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        Library
      </Link>
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
              <Link
                to={`/folder/${folder.id}`}
                className="rounded px-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                {folder.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
