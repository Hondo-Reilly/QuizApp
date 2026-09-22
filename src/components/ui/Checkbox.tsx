import { InputHTMLAttributes } from "react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800 dark:text-neutral-200">
      <input
        type="checkbox"
        className={`h-4 w-4 rounded border-slate-300 accent-brand-500 dark:border-neutral-600 ${className}`}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
