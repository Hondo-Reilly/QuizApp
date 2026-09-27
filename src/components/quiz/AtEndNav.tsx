import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  NextQuestionButton,
  PreviousQuestionButton,
  QuestionStepArrows,
} from "./QuizNavButtons";

export interface AtEndNavProps {
  isFirst: boolean;
  isLast: boolean;
  showSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  /** Shown at the start of the row, beside Previous on wider screens. */
  extra?: ReactNode;
}

export function AtEndNav({
  isFirst,
  isLast,
  showSubmit,
  onPrevious,
  onNext,
  onSubmit,
  extra,
}: AtEndNavProps) {
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
        {showSubmit && <Button onClick={onSubmit}>Submit quiz</Button>}
      </div>
    </div>
  );
}
