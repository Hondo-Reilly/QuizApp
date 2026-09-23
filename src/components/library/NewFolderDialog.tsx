import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DialogActions } from "@/components/ui/DialogActions";
import { FolderFields } from "./FolderFields";

export interface NewFolderDialogProps {
  open: boolean;
  parentName?: string;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string }) => Promise<void>;
}

export function NewFolderDialog({
  open,
  parentName,
  onClose,
  onCreate,
}: NewFolderDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    try {
      setSubmitting(true);
      await onCreate({
        name: trimmed,
        description: description.trim() || undefined,
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
      title="New folder"
      onClose={onClose}
      footer={
        <DialogActions
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmLabel="Create folder"
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
          parentName={parentName}
          newFolder
          error={error}
        />
      </form>
    </Modal>
  );
}
