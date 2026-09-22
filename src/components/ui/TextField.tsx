import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseInput =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800";

export interface FieldLabelProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

export function FieldLabel({ label, hint, htmlFor, children }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-400">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-xs text-slate-500 dark:text-neutral-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
    className?: string;
  },
) {
  const { className = "", ...rest } = props;
  return <input type="text" {...rest} className={`${baseInput} ${className}`} />;
}

export function TextArea(
  props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    className?: string;
  },
) {
  const { className = "", rows = 3, ...rest } = props;
  return <textarea rows={rows} {...rest} className={`${baseInput} ${className}`} />;
}
