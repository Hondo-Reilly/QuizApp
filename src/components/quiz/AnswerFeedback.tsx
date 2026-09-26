import { RichText } from "@/components/content/RichText";
import { gradeQuestion } from "@shared/grading";
import { isOpenQuestion } from "@shared/questionTypes";
import type { Question, SelfMark, UserAnswer } from "@shared/types";
import { SampleAnswerView } from "./OpenAnswer";
import { SelfMarkControl } from "./SelfMarkControl";

export interface AnswerFeedbackProps {
  question: Question;
  value: UserAnswer;
  /** Show the self-mark buttons for written and photo answers. */
  selfMarking?: boolean;
  selfMark?: SelfMark;
  onSelfMark?: (mark: SelfMark | null) => void;
}

/** What appears after submitting an answer in "after each question" mode. */
export function AnswerFeedback({
  question,
  value,
  selfMarking = false,
  selfMark,
  onSelfMark,
}: AnswerFeedbackProps) {
  if (isOpenQuestion(question)) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
        <div className="font-semibold">
          {selfMarking ? "Submitted: compare your answer" : "Submitted: not graded"}
        </div>
        <SampleAnswerView question={question} />
        {question.explanation && (
          <RichText text={question.explanation} className="text-slate-700 dark:text-neutral-300" />
        )}
        {selfMarking && onSelfMark && <SelfMarkControl value={selfMark} onChange={onSelfMark} />}
      </div>
    );
  }

  const correct = gradeQuestion(question, value);
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
      {question.explanation && (
        <RichText text={question.explanation} className="mt-1 text-slate-700 dark:text-neutral-300" />
      )}
    </div>
  );
}
