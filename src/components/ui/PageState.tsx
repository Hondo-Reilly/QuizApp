import { Button } from "./Button";

export function LoadingMessage() {
  return (
    <div className="text-sm text-slate-500 dark:text-neutral-400">
      Loading...
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </div>
  );
}

export interface PageErrorStateProps {
  message: string;
  backLabel: string;
  onBack: () => void;
}

export function PageErrorState({
  message,
  backLabel,
  onBack,
}: PageErrorStateProps) {
  return (
    <div>
      <ErrorNotice message={message} />
      <Button variant="secondary" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}
