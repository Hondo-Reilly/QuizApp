import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FolderTreePicker } from "./FolderTreePicker";
import type { Folder, QuizMetadata } from "@shared/types";

export interface MoveQuizDialogProps {
  open: boolean;
  quiz: QuizMetadata | null;
  folders: Folder[];
  onClose: () => void;
  onMove: (folderId: string | null) => Promise<void>;
}

export function MoveQuizDialog({
  open,
  quiz,
  folders,
  onClose,
  onMove,
}: MoveQuizDialogProps) {
  const [target, setTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && quiz) {
      setTarget(quiz.folderId ?? null);
      setError(null);
      setSubmitting(false);
    }
  }, [open, quiz]);

  const handleMove = async () => {
    if (!quiz) return;
    if (target === (quiz.folderId ?? null)) {
      onClose();
      return;
    }
    try {
      setSubmitting(true);
      await onMove(target);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={quiz ? `Move "${quiz.title}"` : "Move quiz"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={submitting}>
            Move here
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          Choose a destination folder.
        </p>
        <FolderTreePicker folders={folders} value={target} onChange={setTarget} />
        {error && (
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        )}
      </div>
    </Modal>
  );
}
