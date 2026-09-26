import { useState } from "react";
import type { QuizImage } from "@shared/types";
import { useQuizContent } from "./QuizContentContext";

export interface QuizImageViewProps {
  image: QuizImage;
  size?: "large" | "small";
  className?: string;
}

/** A package image; clicking it opens the full-size version. */
export function QuizImageView({ image, size = "large", className = "" }: QuizImageViewProps) {
  const { imageUrl } = useQuizContent();
  const [open, setOpen] = useState(false);
  const url = imageUrl(image.src);
  const alt = image.alt ?? "";

  if (!url) {
    return (
      <span className="text-sm italic text-slate-500 dark:text-neutral-400">
        [{alt || "Image unavailable"}]
      </span>
    );
  }

  const sizeClass = size === "large" ? "max-h-80" : "max-h-32";
  return (
    <>
      <img
        src={url}
        alt={alt}
        onClick={(event) => {
          // Inside a choice button, enlarging must not also pick the answer.
          event.stopPropagation();
          event.preventDefault();
          setOpen(true);
        }}
        className={`${sizeClass} max-w-full self-start cursor-zoom-in rounded-md border border-slate-200 bg-white object-contain dark:border-neutral-700 ${className}`}
      />
      {open && (
        <div
          role="dialog"
          aria-label={alt || "Image"}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
        >
          <img src={url} alt={alt} className="max-h-full max-w-full rounded-md bg-white object-contain" />
        </div>
      )}
    </>
  );
}
