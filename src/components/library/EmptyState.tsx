import { Card } from "@/components/ui/Card";
import { ImportButton } from "./ImportButton";

export interface EmptyStateProps {
  onImport: () => void;
}

export function EmptyState({ onImport }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="text-lg font-semibold text-slate-800 dark:text-neutral-200">
        No quizzes yet
      </div>
      <p className="max-w-md text-sm text-slate-500 dark:text-neutral-400">
        Import a quiz from a JSON file to get started. You can find the schema
        and an authoring prompt in the{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-neutral-800">
          docs/QUIZ_FORMAT.md
        </code>{" "}
        file.
      </p>
      <ImportButton onClick={onImport} />
    </Card>
  );
}
