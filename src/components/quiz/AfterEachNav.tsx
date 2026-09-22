import { Button } from "@/components/ui/Button";

export interface AfterEachNavProps {
  isFirst: boolean;
  isLast: boolean;
  submitted: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onFinish: () => void;
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
}: AfterEachNavProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" onClick={onPrevious} disabled={isFirst}>
        Previous question
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onNext} disabled={isLast}>
          Next question
        </Button>
        {!submitted && (
          <Button onClick={onSubmit} disabled={!canSubmit}>
            Submit
          </Button>
        )}
        {submitted && isLast && (
          <Button onClick={onFinish}>Finish quiz</Button>
        )}
      </div>
    </div>
  );
}
