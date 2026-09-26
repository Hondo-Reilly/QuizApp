import { useEffect, useRef, useState } from "react";
import { PhotoGallery } from "@/components/content/PhotoGallery";
import { usePhotoSource } from "@/components/content/PhotoSource";
import { maxImagesOf } from "@shared/questionTypes";
import type { ImageResponseQuestion, PhotoAnswer } from "@shared/types";

export interface PhotoAnswerInputProps {
  question: ImageResponseQuestion;
  value: PhotoAnswer | null;
  onChange: (value: PhotoAnswer | null) => void;
  disabled: boolean;
}

/** Answer with photos: choose or take one, drop it here, or paste it. */
export function PhotoAnswerInput({ question, value, onChange, disabled }: PhotoAnswerInputProps) {
  const source = usePhotoSource();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const photos = value?.photos ?? [];
  const max = maxImagesOf(question);
  const remaining = max - photos.length;
  const canAdd = !disabled && !!source?.add && remaining > 0;

  // Keep the latest photos for async adds that finish after a re-render.
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const addFiles = async (files: readonly File[]) => {
    if (!source?.add || files.length === 0) return;
    const images = files.filter((file) => !file.type || file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Only image files can be added.");
      return;
    }
    const room = max - photosRef.current.length;
    if (room <= 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of images.slice(0, room)) {
        const name = await source.add(question.id, file);
        onChange({ photos: [...photosRef.current, name] });
        photosRef.current = [...photosRef.current, name];
      }
      if (images.length > room) setError(`Only ${max} ${max === 1 ? "photo" : "photos"} can be added.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo could not be added.");
    } finally {
      setBusy(false);
    }
  };

  // Paste a photo from the clipboard while this question is on screen.
  useEffect(() => {
    if (!canAdd) return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length === 0) return;
      event.preventDefault();
      void addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const remove = (name: string) => {
    const next = photos.filter((photo) => photo !== name);
    onChange(next.length > 0 ? { photos: next } : null);
  };

  return (
    <div className="flex flex-col gap-3">
      <PhotoGallery names={photos} onRemove={disabled ? undefined : remove} />
      {canAdd && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles([...event.dataTransfer.files]);
          }}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
            dragging
              ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
              : "border-slate-300 dark:border-neutral-700"
          }`}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-brand-500 px-3 py-1.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? "Adding photo…" : photos.length === 0 ? "Add a photo" : "Add another photo"}
          </button>
          <span className="text-xs text-slate-500 dark:text-neutral-400">
            Take or choose a photo, drop one here, or paste it.{" "}
            {max > 1 && `Up to ${max} photos.`}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={remaining > 1}
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void addFiles(files);
            }}
          />
        </div>
      )}
      {!canAdd && photos.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-neutral-400">No photo added.</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
