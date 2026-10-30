import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { exampleQuiz, quizFromJson } from "@/lib/startQuiz";
import type { NewQuizState } from "@/pages/QuizEditorPage";
import type { Quiz } from "@shared/types";

export interface NewQuizDialogProps {
  open: boolean;
  /** The folder the new quiz is saved in. */
  folderId: string | null;
  onClose: () => void;
}

const optionClasses =
  "flex w-full flex-col items-start gap-0.5 rounded-lg border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700 dark:hover:bg-brand-500/10";

/** Starts a quiz in the editor: blank, from the example, or from pasted JSON. */
export function NewQuizDialog({ open, folderId, onClose }: NewQuizDialogProps) {
  const ids = useId();
  const navigate = useNavigate();
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setPasting(false);
    setText("");
    setError(null);
  }, [open]);

  const start = (quiz?: Quiz) => {
    const state: NewQuizState = { start: quiz, folderId };
    onClose();
    navigate("/new-quiz", { state });
  };
  const startFromJson = () => {
    try {
      start(quizFromJson(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      open={open}
      title="New quiz"
      onClose={onClose}
      width="max-w-lg"
      footer={
        pasting ? (
          <>
            <Button variant="secondary" onClick={() => setPasting(false)}>
              Back
            </Button>
            <Button onClick={startFromJson} disabled={!text.trim()}>
              Open in editor
            </Button>
          </>
        ) : undefined
      }
    >
      {pasting ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-json`} className="text-sm text-slate-700 dark:text-neutral-300">
            Paste quiz JSON, such as a quiz written by the quiz-app-maker skill.
          </label>
          <textarea
            id={`${ids}-json`}
            rows={12}
            value={text}
            spellCheck={false}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
            }}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button type="button" className={optionClasses} onClick={() => start()}>
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Blank quiz</span>
            <span className="text-xs text-slate-600 dark:text-neutral-400">Start with one empty question.</span>
          </button>
          <button type="button" className={optionClasses} onClick={() => start(exampleQuiz())}>
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Copy of the example quiz</span>
            <span className="text-xs text-slate-600 dark:text-neutral-400">
              Every question type, ready to change into your own.
            </span>
          </button>
          <button type="button" className={optionClasses} onClick={() => setPasting(true)}>
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Paste quiz JSON</span>
            <span className="text-xs text-slate-600 dark:text-neutral-400">
              Open quiz text from Claude or another file in the editor before saving.
            </span>
          </button>
        </div>
      )}
    </Modal>
  );
}
