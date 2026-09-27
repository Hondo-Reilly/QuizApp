import { Button } from "@/components/ui/Button";

interface StepProps {
  disabled: boolean;
  onClick: () => void;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

/** Wider screens only. Phones use QuestionStepArrows. */
export function PreviousQuestionButton({ disabled, onClick }: StepProps) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled} className="hidden sm:inline-flex">
      Previous question
    </Button>
  );
}

/** Wider screens only. Phones use QuestionStepArrows. */
export function NextQuestionButton({ disabled, onClick }: StepProps) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled} className="hidden sm:inline-flex">
      Next question
    </Button>
  );
}

/** Phones only: Previous and Next as arrows side by side at the right edge. */
export function QuestionStepArrows({
  isFirst,
  isLast,
  onPrevious,
  onNext,
}: {
  isFirst: boolean;
  isLast: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:hidden">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={isFirst}
        aria-label="Previous question"
        className="px-3"
      >
        <Chevron direction="left" />
      </Button>
      <Button
        variant="secondary"
        onClick={onNext}
        disabled={isLast}
        aria-label="Next question"
        className="px-3"
      >
        <Chevron direction="right" />
      </Button>
    </div>
  );
}
