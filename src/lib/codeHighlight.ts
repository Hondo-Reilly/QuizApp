import { useEffect, useState } from "react";
import type { HLJSApi } from "highlight.js";

// highlight.js is large, so it loads only when a code answer is on screen.
let load: Promise<HLJSApi> | null = null;

function loadHighlighter(): Promise<HLJSApi> {
  load ??= import("highlight.js/lib/common").then((mod) => mod.default);
  return load;
}

export type Highlight = (code: string) => string;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * A function that turns code into highlighted HTML, or null until highlight.js
 * has loaded. Output is escaped by highlight.js, so it is safe to insert.
 */
export function useHighlighter(language: string | undefined): Highlight | null {
  const [hljs, setHljs] = useState<HLJSApi | null>(null);
  useEffect(() => {
    let active = true;
    void loadHighlighter().then((loaded) => {
      if (active) setHljs(() => loaded);
    });
    return () => {
      active = false;
    };
  }, []);
  if (!hljs) return null;
  return (code: string) => {
    if (!code) return "";
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return escapeHtml(code);
    }
  };
}

export { escapeHtml as escapeCode };
