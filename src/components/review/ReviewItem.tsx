import { QuestionResultCard, ResultBadge } from "@/components/quiz/QuestionResultCard";
import type { Question, UserAnswer } from "@shared/types";

export interface ReviewItemProps {
  index: number;
  question: Question;
  userAnswer: UserAnswer;
  correct: boolean;
}

function describeAnswer(question: Question, answer: UserAnswer): string {
  if (answer === null || answer === undefined) return "No answer";
  switch (question.type) {
    case "true_false":
      return answer ? "True" : "False";
    case "multiple_choice": {
      if (typeof answer !== "string") return "No answer";
      return question.choices.find((c) => c.id === answer)?.text ?? answer;
    }
    case "multi_answer": {
      if (!Array.isArray(answer) || answer.length === 0) return "No answer";
      const map = new Map(question.choices.map((c) => [c.id, c.text]));
      return answer.map((id) => map.get(id) ?? id).join(", ");
    }
  }
}

function describeCorrect(question: Question): string {
  switch (question.type) {
    case "true_false":
      return question.answer ? "True" : "False";
    case "multiple_choice":
      return (
        question.choices.find((c) => c.id === question.answer)?.text ??
        question.answer
      );
    case "multi_answer": {
      const map = new Map(question.choices.map((c) => [c.id, c.text]));
      return question.answers.map((id) => map.get(id) ?? id).join(", ");
    }
  }
}

export function ReviewItem({
  index,
  question,
  userAnswer,
  correct,
}: ReviewItemProps) {
  return (
    <QuestionResultCard
      heading={
        <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          {index + 1}. {question.prompt}
        </h3>
      }
      status={<ResultBadge correct={correct} />}
      explanation={question.explanation}
    >
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Your answer
          </dt>
          <dd
            className={`font-medium ${
              correct
                ? "text-slate-800 dark:text-neutral-200"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {describeAnswer(question, userAnswer)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Correct answer
          </dt>
          <dd className="font-medium text-green-700 dark:text-green-400">
            {describeCorrect(question)}
          </dd>
        </div>
      </dl>

    </QuestionResultCard>
  );
}
