import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { RichText } from "@/components/content/RichText";

export interface QuestionResultCardProps {
  heading: ReactNode;
  status: ReactNode;
  explanation?: string;
  children: ReactNode;
}

export function ResultBadge({ correct }: { correct: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
        correct
          ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
      }`}
    >
      {correct ? "Correct" : "Incorrect"}
    </span>
  );
}

export function QuestionResultCard({
  heading,
  status,
  explanation,
  children,
}: QuestionResultCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        {heading}
        {status}
      </div>
      {children}
      {explanation && (
        <RichText
          text={explanation}
          className="rounded-md bg-slate-50 p-3 text-sm text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
        />
      )}
    </Card>
  );
}
