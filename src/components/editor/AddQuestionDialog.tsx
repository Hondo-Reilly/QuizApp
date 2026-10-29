import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { QuestionType } from "@shared/types";
import { labelClasses } from "./EditorFields";
import { QUESTION_TYPES } from "./QuestionForm";

export interface AddQuestionDialogProps {
  open: boolean;
  /** Where the new question goes, e.g. "After question 8". */
  placement: string;
  onAdd: (type: QuestionType) => void;
  onClose: () => void;
}

function TypeGroup({
  title,
  graded,
  onAdd,
}: {
  title: string;
  graded: boolean;
  onAdd: (type: QuestionType) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={labelClasses}>{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {QUESTION_TYPES.filter((option) => option.graded === graded).map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onAdd(option.type)}
            className="flex min-h-16 flex-col items-start gap-0.5 rounded-lg border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700 dark:hover:bg-brand-500/10"
          >
            <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{option.label}</span>
            <span className="text-xs text-slate-600 dark:text-neutral-400">{option.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AddQuestionDialog({ open, placement, onAdd, onClose }: AddQuestionDialogProps) {
  return (
    <Modal
      open={open}
      title="Add a question"
      onClose={onClose}
      width="max-w-2xl"
      placement="sheet"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-slate-500 dark:text-neutral-400">{placement}</span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <TypeGroup title="Graded by QuizApp" graded onAdd={onAdd} />
        <TypeGroup title="Compared with a sample answer" graded={false} onAdd={onAdd} />
      </div>
    </Modal>
  );
}
