import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/formatDuration";

export interface QuizTimerProps {
  deadlineAt: string;
  onExpire: () => void;
}

export function QuizTimer({ deadlineAt, onExpire }: QuizTimerProps) {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(deadlineAt) - Date.now()),
  );

  useEffect(() => {
    const deadline = Date.parse(deadlineAt);
    let fired = false;
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0 && !fired) {
        fired = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  const urgent = remaining < 60_000;
  const label = formatCountdown(remaining);

  return (
    <div
      className={`shrink-0 rounded-md border px-2.5 py-1 text-sm font-semibold tabular-nums ${
        urgent
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
          : "border-slate-200 bg-white text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      }`}
      role="timer"
      aria-label={`Time remaining ${label}`}
    >
      {label}
    </div>
  );
}
