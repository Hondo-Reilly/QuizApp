import { addChoice, moveChoice, removeChoice, updateChoice } from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import type {
  MultiAnswerQuestion,
  MultipleChoiceQuestion,
  Question,
  TrueFalseQuestion,
} from "@shared/types";
import {
  AddButton,
  DownIcon,
  IconButton,
  inputClasses,
  issuesAt,
  IssueText,
  labelClasses,
  RemoveIcon,
  UpIcon,
  type QuestionChange,
} from "./EditorFields";

export function TrueFalseFields({
  question,
  onChange,
}: {
  question: TrueFalseQuestion;
  onChange: QuestionChange;
}) {
  const set = (answer: boolean) =>
    onChange((q) => (q.type === "true_false" ? { ...q, answer } : q));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${labelClasses} mb-2`}>Correct answer</legend>
      <div className="flex flex-wrap gap-2">
        {[true, false].map((value) => (
          <label
            key={String(value)}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm ${
              question.answer === value
                ? "border-brand-500 bg-brand-50 font-medium dark:bg-brand-500/10"
                : "border-slate-300 dark:border-neutral-700"
            }`}
          >
            <input
              type="radio"
              name={`tf-${question.id}`}
              checked={question.answer === value}
              onChange={() => set(value)}
              className="h-4 w-4 accent-brand-500"
            />
            {value ? "True" : "False"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type ChoiceQuestion = MultipleChoiceQuestion | MultiAnswerQuestion;

/** Choices of a multiple-choice or select-all question, each marked right or wrong. */
export function ChoiceFields({
  question,
  issues,
  onChange,
}: {
  question: ChoiceQuestion;
  issues: readonly QuizIssue[];
  onChange: QuestionChange;
}) {
  const edit = (change: (q: ChoiceQuestion) => Question, key?: string) =>
    onChange((q) => (q.type === question.type ? change(q as ChoiceQuestion) : q), key);
  const single = question.type === "multiple_choice";
  const isCorrect = (id: string) =>
    question.type === "multiple_choice" ? question.answer === id : question.answers.includes(id);
  const toggleCorrect = (id: string) =>
    edit((q) => {
      if (q.type === "multiple_choice") return { ...q, answer: id };
      return q.answers.includes(id)
        ? { ...q, answers: q.answers.filter((item) => item !== id) }
        : { ...q, answers: [...q.answers, id] };
    });

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={labelClasses}>Choices</h3>
        <span className="text-xs text-slate-500 dark:text-neutral-400">
          {single ? "Mark the one correct choice" : "Mark every correct choice"}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {question.choices.map((choice, index) => (
          <li key={choice.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type={single ? "radio" : "checkbox"}
                name={`correct-${question.id}`}
                checked={isCorrect(choice.id)}
                onChange={() => toggleCorrect(choice.id)}
                aria-label={`Choice ${index + 1} is correct`}
                className="h-4 w-4 shrink-0 accent-brand-500"
              />
              <input
                type="text"
                aria-label={`Choice ${index + 1}`}
                value={choice.text}
                placeholder={choice.image ? "Optional with an image" : `Choice ${index + 1}`}
                onChange={(event) =>
                  edit((q) => updateChoice(q, choice.id, { text: event.target.value }), `choice:${choice.id}`)
                }
                className={inputClasses}
              />
              <IconButton
                label={`Move choice ${index + 1} up`}
                disabled={index === 0}
                onClick={() => edit((q) => moveChoice(q, index, index - 1))}
              >
                <UpIcon />
              </IconButton>
              <IconButton
                label={`Move choice ${index + 1} down`}
                disabled={index === question.choices.length - 1}
                onClick={() => edit((q) => moveChoice(q, index, index + 1))}
              >
                <DownIcon />
              </IconButton>
              <IconButton label={`Remove choice ${index + 1}`} onClick={() => edit((q) => removeChoice(q, choice.id))}>
                <RemoveIcon />
              </IconButton>
            </div>
            {choice.image && (
              <span className="pl-6 text-xs text-slate-500 dark:text-neutral-400">Image: {choice.image.src}</span>
            )}
            <div className="pl-6">
              <IssueText issues={issuesAt(issues, `choices.${index}.text`)} />
            </div>
          </li>
        ))}
      </ol>
      <IssueText issues={[...issuesAt(issues, "choices"), ...issuesAt(issues, single ? "answer" : "answers")]} />
      <AddButton onClick={() => edit((q) => addChoice(q))}>Add choice</AddButton>
    </section>
  );
}
