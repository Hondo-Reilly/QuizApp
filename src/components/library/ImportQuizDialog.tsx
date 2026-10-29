import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextField";
import { errorText, formatDay, formatSize } from "@/lib/shareText";
import { normalizeShareCode } from "@shared/cloudShare";
import type { ImportResult } from "@shared/quizApi";
import type { QuizMetadata, SharedQuizInfo } from "@shared/types";

export interface ImportQuizDialogProps {
  open: boolean;
  folderName?: string;
  onClose: () => void;
  onBrowse: () => Promise<ImportResult>;
  onDropFiles: (files: File[]) => Promise<ImportResult>;
  onImportCode: (code: string) => Promise<QuizMetadata>;
}

/** Shows typed digits as "1234 5678". */
function displayCode(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
}

function hasFiles(event: DragEvent): boolean {
  return [...event.dataTransfer.types].includes("Files");
}

type Busy = "file" | "find" | "code" | null;

export function ImportQuizDialog({
  open,
  folderName,
  onClose,
  onBrowse,
  onDropFiles,
  onImportCode,
}: ImportQuizDialogProps) {
  const [dragging, setDragging] = useState(false);
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<SharedQuizInfo | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  // Entering and leaving child elements fires many drag events; count them.
  const dragDepth = useRef(0);

  useEffect(() => {
    if (open) {
      setDragging(false);
      setCode("");
      setInfo(null);
      setBusy(null);
      setError(null);
      dragDepth.current = 0;
    }
  }, [open]);

  const normalized = normalizeShareCode(code);

  const finishFiles = async (work: () => Promise<ImportResult>) => {
    setBusy("file");
    setError(null);
    try {
      const result = await work();
      if (result.cancelled) return;
      if (result.ok) onClose();
      else setError(result.error ?? "Could not import the quiz.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length === 0 || busy) return;
    void finishFiles(() => onDropFiles(files));
  };

  const submitCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!normalized || busy) return;
    setBusy(info ? "code" : "find");
    setError(null);
    try {
      if (!info) {
        setInfo(await quizApi.previewSharedQuiz(normalized));
      } else {
        await onImportCode(normalized);
        onClose();
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const codeLabel = info
    ? busy === "code"
      ? "Importing…"
      : "Import"
    : busy === "find"
      ? "Finding…"
      : "Find quiz";

  return (
    <Modal
      open={open}
      title={folderName ? `Import quiz into "${folderName}"` : "Import quiz"}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div
          onDragEnter={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => {
            if (!hasFiles(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            if (!hasFiles(event)) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging
              ? "border-brand-500 bg-brand-50 dark:bg-neutral-800"
              : "border-slate-300 dark:border-neutral-700"
          }`}
        >
          <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">
            {busy === "file"
              ? "Importing…"
              : dragging
                ? "Drop to import"
                : "Drag a .json or .quiz file here"}
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">or</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void finishFiles(onBrowse)}
            disabled={busy !== null}
          >
            Browse files…
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
          or enter a share code
          <span className="h-px flex-1 bg-slate-200 dark:bg-neutral-800" />
        </div>

        <form className="flex flex-col gap-3" onSubmit={(event) => void submitCode(event)}>
          <div className="flex gap-2">
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
              aria-label="Share code"
              className="font-mono text-lg tracking-widest"
            />
            <Button type="submit" disabled={!normalized || busy !== null}>
              {codeLabel}
            </Button>
          </div>
          {info && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
              <div className="font-medium text-slate-900 dark:text-neutral-100">
                {info.filename}
              </div>
              <div className="mt-1 text-slate-600 dark:text-neutral-400">
                {formatSize(info.size)} · Version {info.version}
                {info.updatedAt && ` · Updated ${formatDay(info.updatedAt)}`}
              </div>
              <div className="mt-2 text-slate-600 dark:text-neutral-400">
                QuizApp checks this code for updates after you import it.
              </div>
            </div>
          )}
        </form>

        {error && (
          <p className="whitespace-pre-line text-sm text-red-700 dark:text-red-400">{error}</p>
        )}
      </div>
    </Modal>
  );
}
