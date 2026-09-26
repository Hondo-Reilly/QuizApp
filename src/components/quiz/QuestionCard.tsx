import type { Question, Scenario, UserAnswer } from "@shared/types";
import { Card } from "@/components/ui/Card";
import { TrueFalseInput } from "./TrueFalseInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { MultiAnswerInput } from "./MultiAnswerInput";
import { FlagButton } from "./FlagButton";
import { TextAnswerInput } from "./TextAnswerInput";
import { CodeEditor } from "./CodeEditor";
import { PhotoAnswerInput } from "./PhotoAnswerInput";
import { isPhotoAnswer } from "@shared/questionTypes";
import { ScenarioPanel } from "./ScenarioPanel";
import { QuizImageView } from "@/components/content/QuizImageView";
import { RichText } from "@/components/content/RichText";

export interface QuestionCardProps {
  question: Question;
  scenario?: Scenario;
  value: UserAnswer;
  onChange: (value: UserAnswer) => void;
  reveal: boolean;
  disabled: boolean;
  choiceOrder?: readonly string[];
  flagged?: boolean;
  onToggleFlag?: () => void;
  /** Enter in a short answer box; usually the page's primary action. */
  onEnter?: () => void;
}

export function QuestionCard({
  question,
  scenario,
  value,
  onChange,
  reveal,
  disabled,
  choiceOrder,
  flagged = false,
  onToggleFlag,
  onEnter,
}: QuestionCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      {scenario && <ScenarioPanel scenario={scenario} />}

      <div className="flex items-start justify-between gap-3">
        <div
          role="heading"
          aria-level={2}
          className="min-w-0 text-lg font-semibold text-slate-900 dark:text-neutral-100"
        >
          <RichText text={question.prompt} />
        </div>
        {onToggleFlag && <FlagButton flagged={flagged} onToggle={onToggleFlag} />}
      </div>

      {question.image && <QuizImageView image={question.image} />}

      {question.type === "true_false" && (
        <TrueFalseInput
          question={question}
          value={typeof value === "boolean" ? value : null}
          onChange={onChange}
          reveal={reveal}
          disabled={disabled}
        />
      )}

      {question.type === "multiple_choice" && (
        <MultipleChoiceInput
          question={question}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          reveal={reveal}
          disabled={disabled}
          choiceOrder={choiceOrder}
        />
      )}

      {question.type === "multi_answer" && (
        <MultiAnswerInput
          question={question}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          reveal={reveal}
          disabled={disabled}
          choiceOrder={choiceOrder}
        />
      )}

      {(question.type === "short_answer" ||
        (question.type === "long_answer" && !question.code)) && (
        <TextAnswerInput
          key={question.id}
          question={question}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          disabled={disabled}
          onEnter={onEnter}
        />
      )}

      {question.type === "long_answer" && question.code && (
        <CodeEditor
          key={question.id}
          question={question}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          disabled={disabled}
        />
      )}

      {question.type === "image_response" && (
        <PhotoAnswerInput
          key={question.id}
          question={question}
          value={isPhotoAnswer(value) ? value : null}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </Card>
  );
}
