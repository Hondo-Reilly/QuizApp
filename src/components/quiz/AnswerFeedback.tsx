import { RichText } from "@/components/content/RichText";

export interface AnswerFeedbackProps {
  correct: boolean;
  explanation?: string;
}

export function AnswerFeedback({
  correct,
  explanation,
}: AnswerFeedbackProps) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        correct
          ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          : "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
      }`}
    >
      <div className="font-semibold">
        {correct ? "Correct" : "Incorrect"}
      </div>
      {explanation && (
        <RichText text={explanation} className="mt-1 text-slate-700 dark:text-neutral-300" />
      )}
    </div>
  );
}
