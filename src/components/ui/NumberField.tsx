import { ChangeEvent } from "react";

export interface NumberFieldProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}

export function NumberField({
  value,
  min,
  max,
  onChange,
  suffix,
  disabled,
}: NumberFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(min, Math.min(parsed, max)));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm tabular-nums text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:disabled:bg-neutral-800"
      />
      {suffix && (
        <span className="text-sm text-slate-600 dark:text-neutral-400">
          {suffix}
        </span>
      )}
    </div>
  );
}
