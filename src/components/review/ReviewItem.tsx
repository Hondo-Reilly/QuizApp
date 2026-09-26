import { QuestionResultCard, ResultBadge } from "@/components/quiz/QuestionResultCard";
import { ChoiceContent } from "@/components/content/ChoiceContent";
import { QuizImageView } from "@/components/content/QuizImageView";
import { RichText } from "@/components/content/RichText";
import type { Choice, Question, UserAnswer } from "@shared/types";

export interface ReviewItemProps {
  index: number;
  question: Question;
  userAnswer: UserAnswer;
  correct: boolean;
}

type Shown = Pick<Choice, "text" | "image">;

const TRUE: Shown = { text: "True" };
const FALSE: Shown = { text: "False" };

function choicesById(question: Question): Map<string, Shown> {
  return question.type === "true_false"
    ? new Map()
    : new Map(question.choices.map((c) => [c.id, c]));
}

function describeAnswer(question: Question, answer: UserAnswer): Shown[] {
  if (answer === null || answer === undefined) return [];
  switch (question.type) {
    case "true_false":
      return [answer ? TRUE : FALSE];
    case "multiple_choice": {
      if (typeof answer !== "string") return [];
      return [choicesById(question).get(answer) ?? { text: answer }];
    }
    case "multi_answer": {
      if (!Array.isArray(answer)) return [];
      const map = choicesById(question);
      return answer.map((id) => map.get(id) ?? { text: id });
    }
  }
}

function describeCorrect(question: Question): Shown[] {
  switch (question.type) {
    case "true_false":
      return [question.answer ? TRUE : FALSE];
    case "multiple_choice":
      return [choicesById(question).get(question.answer) ?? { text: question.answer }];
    case "multi_answer": {
      const map = choicesById(question);
      return question.answers.map((id) => map.get(id) ?? { text: id });
    }
  }
}

function ShownChoices({ items }: { items: Shown[] }) {
  if (items.length === 0) return <>No answer</>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item, index) => (
        <li key={index}>
          <ChoiceContent choice={item} />
        </li>
      ))}
    </ul>
  );
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
        <div
          role="heading"
          aria-level={3}
          className="flex min-w-0 gap-1 text-base font-semibold text-slate-900 dark:text-neutral-100"
        >
          <span className="shrink-0">{index + 1}.</span>
          <RichText text={question.prompt} className="min-w-0" />
        </div>
      }
      status={<ResultBadge correct={correct} />}
      explanation={question.explanation}
    >
      {question.image && <QuizImageView image={question.image} size="small" />}
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
            <ShownChoices items={describeAnswer(question, userAnswer)} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Correct answer
          </dt>
          <dd className="font-medium text-green-700 dark:text-green-400">
            <ShownChoices items={describeCorrect(question)} />
          </dd>
        </div>
      </dl>

    </QuestionResultCard>
  );
}
