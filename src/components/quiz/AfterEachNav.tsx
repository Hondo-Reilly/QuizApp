import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  NextQuestionButton,
  PreviousQuestionButton,
  QuestionStepArrows,
} from "./QuizNavButtons";

/**
 * Submit and the phone's Next share one slot, so the label sits over a hidden
 * copy of the other and the button keeps the same width.
 */
function SubmitSlotLabel({ label }: { label: "Submit" | "Next" }) {
  const other = label === "Submit" ? "Next" : "Submit";
  return (
    <span className="grid justify-items-center">
      <span className="col-start-1 row-start-1">{label}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {other}
      </span>
    </span>
  );
}

export interface AfterEachNavProps {
  isFirst: boolean;
  isLast: boolean;
  submitted: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onFinish: () => void;
  /** Shown at the start of the row, beside Previous on wider screens. */
  extra?: ReactNode;
}

export function AfterEachNav({
  isFirst,
  isLast,
  submitted,
  canSubmit,
  onPrevious,
  onNext,
  onSubmit,
  onFinish,
  extra,
}: AfterEachNavProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <PreviousQuestionButton onClick={onPrevious} disabled={isFirst} />
        {extra}
      </div>
      <div className="flex items-center gap-2">
        <NextQuestionButton onClick={onNext} disabled={isLast} />
        <QuestionStepArrows
          isFirst={isFirst}
          isLast={isLast}
          onPrevious={onPrevious}
          onNext={onNext}
        />
        {!submitted && (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <SubmitSlotLabel label="Submit" />
          </Button>
        )}
        {/* After submitting, phones turn Submit into Next in the same place. */}
        {submitted && !isLast && (
          <Button onClick={onNext} className="sm:hidden">
            <SubmitSlotLabel label="Next" />
          </Button>
        )}
        {submitted && isLast && (
          <Button onClick={onFinish}>Finish quiz</Button>
        )}
      </div>
    </div>
  );
}
