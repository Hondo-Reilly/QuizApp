export interface DeleteIconButtonProps {
  /** Spoken and shown on hover, e.g. 'Delete "Biology"'. */
  label: string;
  onClick: () => void;
  className?: string;
}

/** A trash can that turns red on hover, the size of a small ghost button. */
export function DeleteIconButton({ label, onClick, className = "" }: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-red-950/50 dark:hover:text-red-400 dark:focus-visible:ring-offset-neutral-950 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6.5h16" />
        <path d="M9.5 6.5V4.5h5v2" />
        <path d="M6.5 6.5l.9 13h9.2l.9-13" />
        <path d="M10.25 10.5v5.5M13.75 10.5v5.5" />
      </svg>
    </button>
  );
}
