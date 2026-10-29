import { useEffect, useState } from "react";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Toggle } from "@/components/ui/Toggle";
import type { Question, Scenario, UserAnswer } from "@shared/types";
import { labelClasses } from "./EditorFields";

/**
 * The selected question on the same card people answer in a quiz. Answers
 * typed here are only for trying it out and are never saved.
 */
export function EditorPreview({ question, scenario }: { question: Question; scenario?: Scenario }) {
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [reveal, setReveal] = useState(false);
  // A different question starts hidden again.
  useEffect(() => setReveal(false), [question.id]);
  const value = answers[question.id] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className={labelClasses}>Preview</span>
        <Toggle checked={reveal} onChange={setReveal} label="Check answer" />
      </div>
      <QuestionCard
        question={question}
        scenario={scenario}
        value={value}
        onChange={(next) => setAnswers((current) => ({ ...current, [question.id]: next }))}
        reveal={reveal}
        disabled={reveal}
      />
      {reveal && <AnswerFeedback question={question} value={value} />}
      <p className="text-xs text-slate-500 dark:text-neutral-400">Answers here are for trying the question and aren&apos;t saved.</p>
    </div>
  );
}
