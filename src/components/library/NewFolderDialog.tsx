import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldLabel, TextArea, TextInput } from "@/components/ui/TextField";

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
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            Create folder
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {parentName && (
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Will be created inside <span className="font-medium">{parentName}</span>.
          </p>
        )}
        <FieldLabel label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. History"
            autoFocus
            maxLength={80}
          />
        </FieldLabel>
        <FieldLabel label="Description" hint="Optional - shown on the folder card.">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's in this folder?"
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
