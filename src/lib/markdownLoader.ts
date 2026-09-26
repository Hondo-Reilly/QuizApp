import { useEffect, useState } from "react";
import type { renderMarkdown } from "./markdown";

export type RenderMarkdown = typeof renderMarkdown;

// The Markdown and KaTeX code is large, so it loads only when something needs it.
let rendererLoad: Promise<RenderMarkdown> | null = null;

export function loadMarkdownRenderer(): Promise<RenderMarkdown> {
  rendererLoad ??= import("./markdown").then((mod) => mod.renderMarkdown);
  return rendererLoad;
}

/** The Markdown renderer once loaded, or null while loading or when not needed. */
export function useMarkdownRenderer(needed: boolean): RenderMarkdown | null {
  const [render, setRender] = useState<RenderMarkdown | null>(null);
  useEffect(() => {
    if (!needed) return;
    let cancelled = false;
    void loadMarkdownRenderer().then((loaded) => {
      if (!cancelled) setRender(() => loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [needed]);
  return needed ? render : null;
}
