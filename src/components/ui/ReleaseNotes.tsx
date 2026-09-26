import { useMemo } from "react";
import { useMarkdownRenderer } from "@/lib/markdownLoader";

/** GitHub release notes, which are written in Markdown. */
export function ReleaseNotes({ notes }: { notes: string | null }) {
  const text = notes?.replace(/\r\n/g, "\n").trim() ?? "";
  const render = useMarkdownRenderer(text.length > 0);
  // Release notes have no package images, so image syntax falls back to its alt text.
  const html = useMemo(() => (render ? render(text, () => undefined) : null), [render, text]);

  return (
    <div className="h-40 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
      {text.length === 0 ? (
        <p className="text-slate-500 dark:text-neutral-400">
          This release has no notes.
        </p>
      ) : html === null ? (
        <p className="whitespace-pre-wrap">{text}</p>
      ) : (
        <div
          className="rich-text release-notes"
          // Rendered with raw HTML disabled; see src/lib/markdown.ts.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
