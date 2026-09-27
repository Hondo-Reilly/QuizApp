import type { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";
import { QuizTimer } from "./QuizTimer";

export interface QuizProgressHeaderProps {
  current: number;
  total: number;
  answered: number;
  deadlineAt: string | null;
  onExpire: () => void;
  /** Shown before the timer, such as the live grade. */
  extra?: ReactNode;
  className?: string;
}

export function QuizProgressHeader({
  current,
  total,
  answered,
  deadlineAt,
  onExpire,
  extra,
  className = "",
}: QuizProgressHeaderProps) {
  return (
    <div className={`${className ? `${className} ` : ""}flex items-start gap-3 sm:gap-4`}>
      <div className="min-w-0 flex-1">
        <ProgressBar current={current} total={total} answered={answered} />
      </div>
      {extra}
      {deadlineAt && <QuizTimer deadlineAt={deadlineAt} onExpire={onExpire} />}
    </div>
  );
}
