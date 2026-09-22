import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, TextArea, TextInput } from "@/components/ui/TextField";
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
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FieldLabel label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={80}
          />
        </FieldLabel>
        <FieldLabel label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
          />
        </FieldLabel>
        {error && (
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        )}
      </form>
    </Modal>
  );
}
