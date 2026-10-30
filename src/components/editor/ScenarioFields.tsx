import { useId } from "react";
import { addScenario, removeScenario, updateScenario } from "@shared/quizEdits";
import type { QuizIssue } from "@shared/quizIssues";
import type { Quiz, QuizImage, Scenario } from "@shared/types";
import { AddButton, EditorField, IconButton, inputClasses, labelClasses, TrashIcon } from "./EditorFields";
import { RichTextField } from "./RichTextField";

export interface ScenarioFieldsProps {
  quiz: Quiz;
  issues: readonly QuizIssue[];
  onChange: (change: (quiz: Quiz) => Quiz, key?: string) => void;
  /** Renders the image picker for a scenario, given how to change its image. */
  renderImage?: (scenario: Scenario, set: (image: QuizImage | undefined) => void) => React.ReactNode;
  onAddImage?: () => Promise<QuizImage | null>;
}

function ScenarioCard({
  quiz,
  scenario,
  index,
  issues,
  onChange,
  renderImage,
  onAddImage,
}: Omit<ScenarioFieldsProps, "issues"> & { scenario: Scenario; index: number; issues: readonly QuizIssue[] }) {
  const ids = useId();
  const usedBy = quiz.questions
    .map((question, position) => (question.scenarioId === scenario.id ? position + 1 : 0))
    .filter(Boolean);
  const field = (name: string) => issues.filter((issue) => issue.field === name);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <EditorField label={`Scenario ${index + 1} title`} htmlFor={`${ids}-title`} hint="Optional, e.g. “Case Study 1: …”" issues={field("title")}>
            <input
              id={`${ids}-title`}
              type="text"
              value={scenario.title ?? ""}
              onChange={(event) =>
                onChange((q) => updateScenario(q, scenario.id, { title: event.target.value || undefined }), `scenario:${scenario.id}:title`)
              }
              className={inputClasses}
            />
          </EditorField>
        </div>
        <IconButton
          label={`Remove scenario ${index + 1}`}
          className="mt-6"
          onClick={() => onChange((q) => removeScenario(q, scenario.id))}
        >
          <TrashIcon />
        </IconButton>
      </div>
      <EditorField
        label="Text"
        htmlFor={`${ids}-text`}
        hint={usedBy.length > 0 ? `Shown above questions ${usedBy.join(", ")}.` : "Not used yet. Pick it in a question's Scenario menu."}
        issues={field("text")}
      >
        <RichTextField
          id={`${ids}-text`}
          rows={5}
          markdown={quiz.textFormat === "markdown"}
          value={scenario.text}
          onAddImage={onAddImage}
          onChange={(text) => onChange((q) => updateScenario(q, scenario.id, { text }), `scenario:${scenario.id}:text`)}
        />
      </EditorField>
      {renderImage?.(scenario, (image) => onChange((q) => updateScenario(q, scenario.id, { image })))}
    </li>
  );
}

/** The quiz's shared case studies, each shown above the questions that pick it. */
export function ScenarioFields(props: ScenarioFieldsProps) {
  const { quiz, issues, onChange } = props;
  const scenarios = quiz.scenarios ?? [];
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={labelClasses}>Scenarios</h3>
        <span className="text-xs text-slate-500 dark:text-neutral-400">Shared case studies shown above their questions</span>
      </div>
      {scenarios.length > 0 && (
        <ol className="flex flex-col gap-3">
          {scenarios.map((scenario, index) => (
            <ScenarioCard
              key={scenario.id}
              {...props}
              scenario={scenario}
              index={index}
              issues={issues.filter((issue) => issue.scenarioId === scenario.id)}
            />
          ))}
        </ol>
      )}
      <AddButton onClick={() => onChange((q) => addScenario(q).quiz)}>Add scenario</AddButton>
    </section>
  );
}
