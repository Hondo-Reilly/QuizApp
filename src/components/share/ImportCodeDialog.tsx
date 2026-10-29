import { useEffect, useState, type FormEvent } from "react";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FieldLabel, TextInput } from "@/components/ui/TextField";
import { errorText, formatDay, formatSize } from "@/lib/shareText";
import { normalizeShareCode } from "@shared/cloudShare";
import type { QuizMetadata, SharedQuizInfo } from "@shared/types";

export interface ImportCodeDialogProps {
  open: boolean;
  folderName?: string;
  onClose: () => void;
  onImport: (code: string) => Promise<QuizMetadata>;
}

/** Shows typed digits as "1234 5678". */
function displayCode(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

export function ImportCodeDialog({ open, folderName, onClose, onImport }: ImportCodeDialogProps) {
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<SharedQuizInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
      setInfo(null);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const normalized = normalizeShareCode(code);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!normalized || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!info) {
        setInfo(await quizApi.previewSharedQuiz(normalized));
      } else {
        await onImport(normalized);
        onClose();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const label = info ? (busy ? "Importing…" : "Import") : busy ? "Finding…" : "Find quiz";

  return (
    <Modal
      open={open}
      title="Import from share code"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!normalized || busy}>
            {label}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <FieldLabel label="Share code" hint="8 digits, from the person who shared the quiz.">
          <TextInput
            value={code}
            onChange={(event) => {
              setCode(displayCode(event.target.value));
              setInfo(null);
              setError(null);
            }}
            placeholder="1234 5678"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="font-mono text-lg tracking-widest"
          />
        </FieldLabel>
        {info && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <div className="font-medium text-slate-900 dark:text-neutral-100">{info.filename}</div>
            <div className="mt-1 text-slate-600 dark:text-neutral-400">
              {formatSize(info.size)} · Version {info.version}
              {info.updatedAt && ` · Updated ${formatDay(info.updatedAt)}`}
            </div>
            <div className="mt-2 text-slate-600 dark:text-neutral-400">
              It will be added to {folderName ? `"${folderName}"` : "the library"}. QuizApp checks
              this code for updates.
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
