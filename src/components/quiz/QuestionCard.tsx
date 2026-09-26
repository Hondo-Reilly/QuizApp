import type { Question, Scenario, UserAnswer } from "@shared/types";
import { Card } from "@/components/ui/Card";
import { TrueFalseInput } from "./TrueFalseInput";
import { MultipleChoiceInput } from "./MultipleChoiceInput";
import { MultiAnswerInput } from "./MultiAnswerInput";
import { ScenarioPanel } from "./ScenarioPanel";

export interface QuestionCardProps {
  question: Question;
  scenario?: Scenario;
  value: UserAnswer;
  onChange: (value: UserAnswer) => void;
  reveal: boolean;
  disabled: boolean;
  choiceOrder?: readonly string[];
}

export function QuestionCard({
  question,
  scenario,
  value,
  onChange,
  reveal,
  disabled,
  choiceOrder,
}: QuestionCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      {scenario && <ScenarioPanel scenario={scenario} />}

      <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
        {question.prompt}
      </h2>

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
    </Card>
  );
}
