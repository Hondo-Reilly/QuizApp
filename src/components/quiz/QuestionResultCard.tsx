import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { RichText } from "@/components/content/RichText";
import type { QuestionOutcome, SelfMark } from "@shared/types";

export interface QuestionResultCardProps {
  heading: ReactNode;
  status: ReactNode;
  explanation?: string;
  children: ReactNode;
}

const BADGE_TONE = {
  green: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
};

function badgeFor(outcome: QuestionOutcome, selfMark?: SelfMark): [string, keyof typeof BADGE_TONE] {
  // A self-marked answer says so, rather than claiming the app graded it.
  if (selfMark === "got") return ["Got it", "green"];
  if (selfMark === "missed") return ["Missed it", "red"];
  if (selfMark === "unsure") return ["Not sure", "amber"];
  if (outcome === "correct") return ["Correct", "green"];
  if (outcome === "wrong") return ["Incorrect", "red"];
  return ["Not graded", "violet"];
}

export function ResultBadge({ outcome, selfMark }: { outcome: QuestionOutcome; selfMark?: SelfMark }) {
  const [label, tone] = badgeFor(outcome, selfMark);
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_TONE[tone]}`}>
      {label}
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
