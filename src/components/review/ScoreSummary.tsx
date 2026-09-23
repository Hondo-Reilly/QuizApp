import { Card } from "@/components/ui/Card";

export interface ScoreSummaryProps {
  correct: number;
  total: number;
  percent: number;
  timeTaken?: string | null;
}

function tone(percent: number): string {
  if (percent >= 80) return "text-green-700 dark:text-green-400";
  if (percent >= 50) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

export function ScoreSummary({
  correct,
  total,
  percent,
  timeTaken,
}: ScoreSummaryProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500 dark:text-neutral-400">
            Your score
          </div>
          <div className={`text-4xl font-semibold ${tone(percent)}`}>
            {percent}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500 dark:text-neutral-400">
            Correct
          </div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
            {correct} / {total}
          </div>
        </div>
      </div>
      {timeTaken && (
        <div className="text-sm text-slate-500 dark:text-neutral-400">
          Time taken{" "}
          <span className="font-medium tabular-nums text-slate-800 dark:text-neutral-200">
            {timeTaken}
          </span>
        </div>
      )}
    </Card>
  );
}
