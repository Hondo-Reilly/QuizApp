import { useState } from "react";
import { usePhotoUrls } from "./PhotoSource";

export interface PhotoGalleryProps {
  names: readonly string[];
  size?: "large" | "small";
  /** Shows a remove button on each photo. */
  onRemove?: (name: string) => void;
}

/** Photo thumbnails from an image-response answer; click one to see it full size. */
export function PhotoGallery({ names, size = "large", onRemove }: PhotoGalleryProps) {
  const urls = usePhotoUrls(names);
  const [open, setOpen] = useState<string | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  if (names.length === 0) return null;
  const thumb = size === "large" ? "h-40" : "h-24";

  return (
    <>
      <ul className="flex flex-wrap gap-3">
        {names.map((name, index) => (
          <li key={name} className="relative">
            {failed.has(name) ? (
              <div
                className={`${thumb} flex w-32 items-center justify-center rounded-md border border-dashed border-slate-300 px-2 text-center text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400`}
              >
                Photo added on another device
              </div>
            ) : urls[name] ? (
              <button
                type="button"
                onClick={() => setOpen(name)}
                className="block cursor-zoom-in overflow-hidden rounded-md border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700"
              >
                <img
                  src={urls[name]}
                  alt={`Photo ${index + 1}`}
                  onError={() => setFailed((current) => new Set(current).add(name))}
                  className={`${thumb} w-auto max-w-[16rem] object-contain`}
                />
              </button>
            ) : (
              <div
                className={`${thumb} flex w-32 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-500 dark:border-neutral-700 dark:text-neutral-400`}
              >
                Loading photo…
              </div>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(name)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-sm text-white shadow hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-red-500 dark:hover:text-white"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {open && urls[open] && (
        <div
          role="dialog"
          aria-label="Photo"
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onClick={() => setOpen(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(null);
            }
          }}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
        >
          <img src={urls[open]} alt="" className="max-h-full max-w-full rounded-md bg-white object-contain" />
        </div>
      )}
    </>
  );
}
