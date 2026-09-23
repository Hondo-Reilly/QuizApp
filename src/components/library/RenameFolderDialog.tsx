import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DialogActions } from "@/components/ui/DialogActions";
import { FolderFields } from "./FolderFields";
import type { Folder } from "@shared/types";

export interface RenameFolderDialogProps {
  open: boolean;
  folder: Folder | null;
  onClose: () => void;
  onSave: (input: {
    id: string;
    name: string;
    description?: string;
  }) => Promise<void>;
}

export function RenameFolderDialog({
  open,
  folder,
  onClose,
  onSave,
}: RenameFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && folder) {
      setName(folder.name);
      setDescription(folder.description ?? "");
      setError(null);
      setSubmitting(false);
    }
  }, [open, folder]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!folder) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    try {
      setSubmitting(true);
      await onSave({
        id: folder.id,
        name: trimmed,
        description: description.trim(),
      });
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
      title="Rename folder"
      onClose={onClose}
      footer={
        <DialogActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmLabel="Save changes"
          busy={submitting}
        />
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FolderFields
          name={name}
          description={description}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          error={error}
        />
      </form>
    </Modal>
  );
}
