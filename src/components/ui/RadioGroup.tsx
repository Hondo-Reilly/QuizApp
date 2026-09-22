export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface RadioGroupProps<T extends string> {
  name: string;
  value: T;
  options: ReadonlyArray<RadioOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: RadioGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = opt.value === value;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              checked
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            } ${disabled ? "opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="mt-1 h-4 w-4 accent-brand-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-800 dark:text-neutral-200">
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  {opt.description}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
