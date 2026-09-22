import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Folder } from "@shared/types";

export interface FolderCardProps {
  folder: Folder;
  quizCount: number;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-brand-500"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function FolderCard({
  folder,
  quizCount,
  onRename,
  onDelete,
}: FolderCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => navigate(`/folder/${folder.id}`)}
        className="flex flex-1 flex-col gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <FolderIcon />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            {folder.name}
          </h3>
        </div>
        {folder.description && (
          <p className="line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">
            {folder.description}
          </p>
        )}
        <div className="text-xs text-slate-500 dark:text-neutral-400">
          {quizCount} {quizCount === 1 ? "quiz" : "quizzes"}
        </div>
      </button>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onRename(folder)}>
          Rename
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(folder)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
