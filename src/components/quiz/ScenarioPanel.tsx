import type { Scenario } from "@shared/types";

export interface ScenarioPanelProps {
  scenario: Scenario;
  className?: string;
}

export function ScenarioPanel({ scenario, className = "" }: ScenarioPanelProps) {
  return (
    <section
      aria-label={scenario.title ?? "Scenario"}
      className={`flex flex-col gap-2 rounded-lg border-l-4 border-slate-300 bg-slate-50 p-4 dark:border-neutral-600 dark:bg-neutral-800/60 ${className}`}
    >
      {scenario.title && (
        <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {scenario.title}
        </h3>
      )}
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
        {scenario.text}
      </p>
    </section>
  );
}
