import { useRef, useState, type ClipboardEvent } from "react";
import { RichText } from "@/components/content/RichText";
import { cellsFromSpreadsheet, formatTable, tableAt, type TableCells } from "@/lib/markdownTable";
import type { QuizImage } from "@shared/types";
import { inputClasses } from "./EditorFields";
import { EquationDialog, TableDialog, type EquationResult } from "./RichTextTools";

type View = "write" | "split" | "preview";

export interface RichTextFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Whether the quiz uses Markdown. Plain quizzes get a plain text box. */
  markdown: boolean;
  rows?: number;
  placeholder?: string;
  /** Adds an image to the quiz and returns it, to place in the text. */
  onAddImage?: () => Promise<QuizImage | null>;
}

const BLANK_TABLE: TableCells = [
  ["", ""],
  ["", ""],
  ["", ""],
];

const toolClasses =
  "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded px-2 text-sm text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-neutral-200 dark:hover:bg-neutral-700";

/** Text that may hold blocks like tables needs blank lines around them. */
function asBlock(before: string, block: string, after: string): { text: string; caret: number } {
  const lead = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const text = before + lead + block + trail + after;
  return { text, caret: (before + lead + block).length };
}

/**
 * A text box for prompts, explanations, scenarios, and sample answers. In a
 * Markdown quiz it adds a formatting toolbar, equation and table tools, and
 * a preview beside or instead of the text.
 */
export function RichTextField({
  id,
  value,
  onChange,
  markdown,
  rows = 4,
  placeholder,
  onAddImage,
}: RichTextFieldProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<View>("write");
  const [equation, setEquation] = useState<{ start: number; end: number; initial: EquationResult } | null>(null);
  const [table, setTable] = useState<{ start: number; end: number; cells: TableCells; editing: boolean } | null>(null);

  const selection = () => {
    const area = areaRef.current;
    return { start: area?.selectionStart ?? value.length, end: area?.selectionEnd ?? value.length };
  };

  const replace = (start: number, end: number, text: string, caretStart: number, caretEnd = caretStart) => {
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(caretStart, caretEnd);
    });
  };

  const wrap = (mark: string, fallback: string) => {
    const { start, end } = selection();
    const inner = value.slice(start, end) || fallback;
    replace(start, end, `${mark}${inner}${mark}`, start + mark.length, start + mark.length + inner.length);
  };

  const insertBlock = (start: number, end: number, block: string) => {
    const { text, caret } = asBlock(value.slice(0, start), block, value.slice(end));
    onChange(text);
    requestAnimationFrame(() => {
      areaRef.current?.focus();
      areaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const openEquation = () => {
    const { start, end } = selection();
    const selected = value.slice(start, end).trim();
    const display = selected.startsWith("$$");
    const latex = selected.replace(/^\$\$?|\$\$?$/g, "").trim();
    setEquation({ start, end, initial: { latex, display } });
  };

  const openTable = () => {
    const { start, end } = selection();
    const found = tableAt(value, start);
    setTable(
      found
        ? { start: found.start, end: found.end, cells: found.cells, editing: true }
        : { start, end, cells: BLANK_TABLE, editing: false },
    );
  };

  const addImage = async () => {
    if (!onAddImage) return;
    const { start, end } = selection();
    const image = await onAddImage();
    if (!image) return;
    insertBlock(start, end, `![${image.alt ?? ""}](${image.src})`);
  };

  // A table copied from a spreadsheet arrives as tab-separated lines.
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!markdown) return;
    const cells = cellsFromSpreadsheet(event.clipboardData.getData("text/plain"));
    if (!cells) return;
    event.preventDefault();
    const { start, end } = selection();
    insertBlock(start, end, formatTable(cells));
  };

  const area = (
    <textarea
      id={id}
      ref={areaRef}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onPaste={onPaste}
      className={`${inputClasses} resize-y ${markdown ? "rounded-none border-0 font-mono text-[13px] leading-relaxed focus:ring-0 sm:text-[13px]" : ""}`}
    />
  );
  if (!markdown) return area;

  const preview = (
    <div aria-label="Preview" className="min-h-[6rem] overflow-x-auto p-3 text-sm text-slate-900 dark:text-neutral-100">
      {value.trim() ? <RichText text={value} /> : <span className="text-slate-500 dark:text-neutral-400">Nothing to preview yet.</span>}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-md border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 dark:border-neutral-700">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-neutral-700 dark:bg-neutral-800">
        <button type="button" className={`${toolClasses} font-bold`} aria-label="Bold" title="Bold" onClick={() => wrap("**", "bold text")}>
          B
        </button>
        <button type="button" className={`${toolClasses} font-serif italic`} aria-label="Italic" title="Italic" onClick={() => wrap("*", "italic text")}>
          I
        </button>
        <button type="button" className={`${toolClasses} font-mono text-xs`} aria-label="Inline code" title="Inline code" onClick={() => wrap("`", "code")}>
          {"</>"}
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-300 dark:bg-neutral-600" />
        <button type="button" className={toolClasses} onClick={openEquation}>
          <span aria-hidden="true" className="font-serif">Σ</span> Equation
        </button>
        <button type="button" className={toolClasses} onClick={openTable}>
          ⊞ Table
        </button>
        {onAddImage && (
          <button type="button" className={toolClasses} onClick={() => void addImage()}>
            Image
          </button>
        )}
        <button
          type="button"
          className={`${toolClasses} font-mono text-xs`}
          onClick={() => {
            const { start, end } = selection();
            insertBlock(start, end, `\`\`\`\n${value.slice(start, end) || "code"}\n\`\`\``);
          }}
        >
          Code block
        </button>
        <div role="radiogroup" aria-label="View" className="ml-auto flex overflow-hidden rounded-md border border-slate-300 dark:border-neutral-600">
          {(["write", "split", "preview"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={view === option}
              onClick={() => setView(option)}
              className={`h-7 px-2.5 text-xs capitalize ${
                view === option ? "bg-brand-500 text-white" : "bg-white text-slate-700 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {view === "write" && area}
      {view === "preview" && preview}
      {view === "split" && (
        <div className="grid sm:grid-cols-2">
          <div className="border-b border-slate-200 sm:border-b-0 sm:border-r dark:border-neutral-700">{area}</div>
          {preview}
        </div>
      )}

      <EquationDialog
        open={equation !== null}
        initial={equation?.initial ?? { latex: "", display: false }}
        onClose={() => setEquation(null)}
        onInsert={({ latex, display }) => {
          if (!equation) return;
          if (display) insertBlock(equation.start, equation.end, `$$\n${latex}\n$$`);
          else replace(equation.start, equation.end, `$${latex}$`, equation.start + latex.length + 2);
          setEquation(null);
        }}
      />
      <TableDialog
        open={table !== null}
        initial={table?.cells ?? BLANK_TABLE}
        editing={table?.editing ?? false}
        onClose={() => setTable(null)}
        onSave={(cells) => {
          if (!table) return;
          if (table.editing) replace(table.start, table.end, formatTable(cells), table.start);
          else insertBlock(table.start, table.end, formatTable(cells));
          setTable(null);
        }}
      />
    </div>
  );
}
