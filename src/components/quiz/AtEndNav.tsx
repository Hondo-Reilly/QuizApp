import { Button } from "@/components/ui/Button";

export interface AtEndNavProps {
  isFirst: boolean;
  isLast: boolean;
  showSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function AtEndNav({
  isFirst,
  isLast,
  showSubmit,
  onPrevious,
  onNext,
  onSubmit,
}: AtEndNavProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={isFirst}
      >
        Previous question
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onNext} disabled={isLast}>
          Next question
        </Button>
        {showSubmit && <Button onClick={onSubmit}>Submit quiz</Button>}
      </div>
    </div>
  );
}
