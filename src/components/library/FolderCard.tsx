import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LibraryItemCard } from "./LibraryItemCard";
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
    <LibraryItemCard
      variant="folder"
      title={folder.name}
      description={folder.description}
      icon={<FolderIcon />}
      onOpen={() => navigate(`/folder/${folder.id}`)}
      metadata={
        <>
          {quizCount} {quizCount === 1 ? "quiz" : "quizzes"}
        </>
      }
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => onRename(folder)}>
            Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(folder)}>
            Delete
          </Button>
        </>
      }
    />
  );
}
