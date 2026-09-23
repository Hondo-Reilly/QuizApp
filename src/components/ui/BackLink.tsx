export interface BackLinkProps {
  onClick: () => void;
}

export function BackLink({ onClick }: BackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 text-sm text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-100"
    >
      ← Back
    </button>
  );
}
