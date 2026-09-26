import { useId, useMemo, useRef } from "react";
import { useTextDraft } from "@/hooks/useTextDraft";
import { escapeCode, useHighlighter } from "@/lib/codeHighlight";
import { textLimits } from "@shared/questionTypes";
import type { LongAnswerQuestion } from "@shared/types";
import { CharacterCount } from "./TextAnswerInput";

const INDENT = "    ";
const MIN_LINES = 8;
const MAX_LINES = 28;

function LineNumbers({ count }: { count: number }) {
  return (
    <div
      aria-hidden="true"
      className="code-font select-none border-r border-slate-200 bg-slate-50 px-3 py-3 text-right text-slate-400 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-600"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

/** Read-only code with line numbers and highlighting, for answers and sample answers. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const highlight = useHighlighter(language);
  const html = useMemo(() => (highlight ? highlight(code) : escapeCode(code)), [highlight, code]);
  const lines = Math.max(1, code.split("\n").length);
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
      <LineNumbers count={lines} />
      <pre className="code-font hljs-theme m-0 min-w-0 flex-1 overflow-x-auto px-3 py-3">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export interface CodeEditorProps {
  question: LongAnswerQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * A plain textarea over a highlighted copy of its own text. Tab indents; press
 * Escape first to move focus out with Tab instead.
 */
export function CodeEditor({ question, value: saved, onChange, disabled }: CodeEditorProps) {
  const { minLength, maxLength } = textLimits(question);
  const { draft: value, change, flush } = useTextDraft(saved, onChange);
  const highlight = useHighlighter(question.language);
  const layerRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const escaped = useRef(false);
  const countId = useId();
  const hintId = useId();

  const lineCount = Math.max(1, value.split("\n").length);
  const rows = Math.min(MAX_LINES, Math.max(MIN_LINES, lineCount));
  // The trailing newline keeps the highlighted layer as tall as the textarea.
  const html = useMemo(
    () => `${highlight ? highlight(value) : escapeCode(value)}\n`,
    [highlight, value],
  );

  const syncScroll = (area: HTMLTextAreaElement) => {
    if (layerRef.current) {
      layerRef.current.scrollTop = area.scrollTop;
      layerRef.current.scrollLeft = area.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = area.scrollTop;
  };

  const replaceSelection = (
    area: HTMLTextAreaElement,
    start: number,
    end: number,
    text: string,
    caret: number,
  ) => {
    const next = value.slice(0, start) + text + value.slice(end);
    if (next.length > maxLength) return;
    change(next);
    requestAnimationFrame(() => area.setSelectionRange(caret, caret));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      escaped.current = true;
      return;
    }
    const leaving = escaped.current;
    escaped.current = false;
    if (event.key !== "Tab" || leaving || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    const area = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = area;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    if (event.shiftKey) {
      const removable = value.slice(lineStart, lineStart + INDENT.length).match(/^ {1,4}/)?.[0] ?? "";
      if (!removable) return;
      replaceSelection(area, lineStart, lineStart + removable.length, "", Math.max(lineStart, start - removable.length));
      return;
    }
    replaceSelection(area, start, end, INDENT, start + INDENT.length);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex overflow-hidden rounded-lg border bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 dark:bg-neutral-900 ${
          disabled ? "border-slate-200 dark:border-neutral-800" : "border-slate-300 dark:border-neutral-700"
        }`}
      >
        <div ref={gutterRef} className="overflow-hidden" style={{ maxHeight: `calc(${rows} * 1.6em + 1.5rem)` }}>
          <LineNumbers count={Math.max(lineCount, rows)} />
        </div>
        <div className="relative min-w-0 flex-1">
          <pre
            ref={layerRef}
            aria-hidden="true"
            className="code-font hljs-theme pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre px-3 py-3 text-slate-800 dark:text-neutral-200"
          >
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
          <textarea
            aria-label="Your code"
            aria-describedby={`${countId} ${hintId}`}
            value={value}
            maxLength={maxLength}
            disabled={disabled}
            rows={rows}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            placeholder="Write your code"
            onChange={(event) => change(event.target.value)}
            onBlur={flush}
            onKeyDown={onKeyDown}
            onScroll={(event) => syncScroll(event.currentTarget)}
            className="code-font code-input relative block w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 focus:outline-none disabled:cursor-default"
          />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <CharacterCount id={countId} length={value.length} minLength={minLength} maxLength={maxLength} />
        <span id={hintId} className="text-xs text-slate-400 dark:text-neutral-500">
          Tab indents. Press Esc, then Tab, to move on.
        </span>
      </div>
    </div>
  );
}
