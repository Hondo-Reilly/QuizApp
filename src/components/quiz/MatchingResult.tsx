import { ChoiceContent } from "@/components/content/ChoiceContent";
import { RichText } from "@/components/content/RichText";
import { countCorrectMatches, letteredChoices, matchesOf } from "@shared/matching";
import type { MatchingQuestion, UserAnswer } from "@shared/types";

/**
 * Each item with its correct match and, when `showAnswer` is set, the user's
 * pick. Choices keep the quiz's own order and letters.
 */
export function MatchingResult({
  question,
  answer,
  showAnswer,
}: {
  question: MatchingQuestion;
  answer: UserAnswer | undefined;
  showAnswer: boolean;
}) {
  const bank = new Map(letteredChoices(question.choices).map((choice) => [choice.id, choice]));
  const matches = matchesOf(answer);
  const shown = (choiceId: string | undefined) => {
    const choice = choiceId ? bank.get(choiceId) : undefined;
    if (!choice) return <span className="text-slate-500 dark:text-neutral-400">No answer</span>;
    return (
      <span className="flex gap-1.5">
        <span className="shrink-0 font-semibold">{choice.letter}.</span>
        <span className="min-w-0">
          <ChoiceContent choice={choice} />
        </span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {showAnswer && (
        <div className="text-sm font-medium text-slate-700 dark:text-neutral-300">
          {countCorrectMatches(question, answer)} of {question.items.length} matched
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {question.items.map((item, index) => {
          const right = matches[item.id] === item.answer;
          const showYours = showAnswer;
          const showCorrect = !showAnswer || !right;
          const tone = !showAnswer
            ? "border-slate-200 dark:border-neutral-800"
            : right
              ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
              : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40";
          return (
            <li key={item.id} className={`flex flex-col gap-1.5 rounded-md border px-3 py-2 text-sm ${tone}`}>
              <div className="flex gap-1.5 font-medium text-slate-900 dark:text-neutral-100">
                <span className="shrink-0 tabular-nums">{index + 1}.</span>
                <RichText text={item.text} inline className="min-w-0" />
              </div>
              {/* Two columns only when both matches show; one match gets the full width. */}
              <dl
                className={`grid grid-cols-1 gap-1 ${showYours && showCorrect ? "sm:grid-cols-2" : ""}`}
              >
                {showYours && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">Your match</dt>
                    <dd className={right ? "text-slate-800 dark:text-neutral-200" : "text-red-700 dark:text-red-400"}>
                      {shown(matches[item.id])}
                    </dd>
                  </div>
                )}
                {showCorrect && (
                  <div>
                    {/* Alone on the line, the green answer needs no visible label. */}
                    <dt
                      className={
                        showYours
                          ? "text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400"
                          : "sr-only"
                      }
                    >
                      Correct match
                    </dt>
                    <dd className="text-green-700 dark:text-green-400">{shown(item.answer)}</dd>
                  </div>
                )}
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
