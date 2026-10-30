import { useId } from "react";
import { QuizImageView } from "@/components/content/QuizImageView";
import { Button } from "@/components/ui/Button";
import type { QuizImage } from "@shared/types";
import { inputClasses, labelClasses } from "./EditorFields";

export interface ImageFieldProps {
  image: QuizImage | undefined;
  onChange: (image: QuizImage | undefined) => void;
  /** Picks an image file, adds it to the quiz, and returns it. */
  onAddImage: () => Promise<QuizImage | null>;
  label?: string;
  /** A small layout for choices: a button until there is an image. */
  compact?: boolean;
}

/** An image shown with a question, choice, or scenario, with its description. */
export function ImageField({ image, onChange, onAddImage, label = "Image", compact = false }: ImageFieldProps) {
  const ids = useId();
  const choose = async () => {
    const added = await onAddImage();
    // A replaced image keeps its description.
    if (added) onChange({ ...added, alt: image?.alt ?? added.alt });
  };

  if (!image) {
    return (
      <div>
        <Button variant="secondary" size="sm" onClick={() => void choose()}>
          {compact ? "Add image" : `Add ${label.toLowerCase()}`}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-start gap-3 ${compact ? "" : "rounded-lg border border-slate-200 p-3 dark:border-neutral-800"}`}>
      <QuizImageView image={image} size="small" />
      <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
        {!compact && <span className={labelClasses}>{label}</span>}
        <label htmlFor={`${ids}-alt`} className="text-xs text-slate-600 dark:text-neutral-400">
          Description for screen readers, and if the image can&apos;t load
        </label>
        <input
          id={`${ids}-alt`}
          type="text"
          value={image.alt ?? ""}
          placeholder="What the image shows, without giving away the answer"
          onChange={(event) => onChange({ ...image, alt: event.target.value || undefined })}
          className={inputClasses}
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void choose()}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
