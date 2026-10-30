import { Toggle } from "@/components/ui/Toggle";
import { letteredChoices } from "@shared/matching";
import {
  addChoice,
  addMatchItem,
  moveChoice,
  moveMatchItem,
  removeChoice,
  removeMatchItem,
  updateChoice,
  updateMatchItem,
} from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import type { MatchingQuestion, Question, QuizImage } from "@shared/types";
import { ImageField } from "./ImageField";
import {
  AddButton,
  DownIcon,
  IconButton,
  ImageIcon,
  inputClasses,
  issuesAt,
  IssueText,
  labelClasses,
  RemoveIcon,
  UpIcon,
  type QuestionChange,
} from "./EditorFields";

export function MatchingFields({
  question,
  issues,
  onChange,
  onAddImage,
}: {
  question: MatchingQuestion;
  issues: readonly QuizIssue[];
  onChange: QuestionChange;
  onAddImage?: () => Promise<QuizImage | null>;
}) {
  const edit = (change: (q: MatchingQuestion) => Question, key?: string) =>
    onChange((q) => (q.type === "matching" ? change(q) : q), key);
  const bank = letteredChoices(question.choices);
  const matched = new Set(question.items.map((item) => item.answer));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={labelClasses}>Items</h3>
          <span className="text-xs text-slate-500 dark:text-neutral-400">Shown in this order</span>
        </div>
        <ol className="flex flex-col gap-2">
          {question.items.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-sm tabular-nums text-slate-500 dark:text-neutral-400">{index + 1}.</span>
                <input
                  type="text"
                  aria-label={`Item ${index + 1}`}
                  value={item.text}
                  placeholder="Concept or term"
                  onChange={(event) =>
                    edit((q) => updateMatchItem(q, item.id, { text: event.target.value }), `item:${item.id}`)
                  }
                  className={`${inputClasses} min-w-0 flex-[1_1_10rem]`}
                />
                <select
                  aria-label={`Correct match for item ${index + 1}`}
                  value={item.answer}
                  onChange={(event) => edit((q) => updateMatchItem(q, item.id, { answer: event.target.value }))}
                  className={`${inputClasses} min-w-0 flex-[1_1_12rem]`}
                >
                  <option value="">Choose a match…</option>
                  {bank.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.letter}. {choice.text.trim() || "(image)"}
                    </option>
                  ))}
                </select>
                <div className="flex">
                  <IconButton
                    label={`Move item ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => edit((q) => moveMatchItem(q, index, index - 1))}
                  >
                    <UpIcon />
                  </IconButton>
                  <IconButton
                    label={`Move item ${index + 1} down`}
                    disabled={index === question.items.length - 1}
                    onClick={() => edit((q) => moveMatchItem(q, index, index + 1))}
                  >
                    <DownIcon />
                  </IconButton>
                  <IconButton label={`Remove item ${index + 1}`} onClick={() => edit((q) => removeMatchItem(q, item.id))}>
                    <RemoveIcon />
                  </IconButton>
                </div>
              </div>
              <div className="pl-8">
                <IssueText issues={[...issuesAt(issues, `items.${index}.text`), ...issuesAt(issues, `items.${index}.answer`)]} />
              </div>
            </li>
          ))}
        </ol>
        <IssueText issues={issuesAt(issues, "items")} />
        <AddButton onClick={() => edit((q) => addMatchItem(q))}>Add item</AddButton>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={labelClasses}>Choice bank</h3>
          <span className="text-xs text-slate-500 dark:text-neutral-400">Letters follow this order</span>
        </div>
        <ol className="flex flex-col gap-2">
          {bank.map((choice, index) => (
            <li key={choice.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-6 text-sm font-semibold">{choice.letter}.</span>
                <input
                  type="text"
                  aria-label={`Choice ${choice.letter}`}
                  value={choice.text}
                  placeholder="Statement"
                  onChange={(event) =>
                    edit((q) => updateChoice(q, choice.id, { text: event.target.value }), `choice:${choice.id}`)
                  }
                  className={`${inputClasses} min-w-0 flex-1`}
                />
                {!matched.has(choice.id) && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Distractor
                  </span>
                )}
                {onAddImage && !choice.image && (
                  <IconButton
                    label={`Add an image to choice ${choice.letter}`}
                    onClick={() =>
                      void onAddImage().then((image) => image && edit((q) => updateChoice(q, choice.id, { image })))
                    }
                  >
                    <ImageIcon />
                  </IconButton>
                )}
                <IconButton
                  label={`Move choice ${choice.letter} up`}
                  disabled={index === 0}
                  onClick={() => edit((q) => moveChoice(q, index, index - 1))}
                >
                  <UpIcon />
                </IconButton>
                <IconButton
                  label={`Move choice ${choice.letter} down`}
                  disabled={index === bank.length - 1}
                  onClick={() => edit((q) => moveChoice(q, index, index + 1))}
                >
                  <DownIcon />
                </IconButton>
                <IconButton label={`Remove choice ${choice.letter}`} onClick={() => edit((q) => removeChoice(q, choice.id))}>
                  <RemoveIcon />
                </IconButton>
              </div>
              {choice.image && onAddImage && (
                <div className="pl-8">
                  <ImageField
                    compact
                    image={choice.image}
                    onAddImage={onAddImage}
                    onChange={(image) => edit((q) => updateChoice(q, choice.id, { image }))}
                  />
                </div>
              )}
              <div className="pl-8">
                <IssueText issues={issuesAt(issues, `choices.${index}.text`)} />
              </div>
            </li>
          ))}
        </ol>
        <IssueText issues={issuesAt(issues, "choices")} />
        <AddButton onClick={() => edit((q) => addChoice(q))}>Add choice</AddButton>
      </section>

      <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
        <Toggle
          checked={question.reuseChoices === true}
          onChange={(reuse) => edit((q) => ({ ...q, reuseChoices: reuse ? true : undefined }))}
          label="Let a choice match more than one item"
          description="Off: each choice is used once and leaves the other drop-downs once picked."
        />
        <IssueText issues={issuesAt(issues, "reuseChoices")} />
      </div>
    </div>
  );
}
