import { useEffect, useId, useRef, useState } from "react";
import { RichText } from "@/components/content/RichText";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { TableCells } from "@/lib/markdownTable";
import { IconButton, inputClasses, labelClasses, RemoveIcon } from "./EditorFields";

const SYMBOLS: { label: string; insert: string; name: string }[] = [
  { label: "a/b", insert: "\\frac{a}{b}", name: "Fraction" },
  { label: "x²", insert: "^{2}", name: "Superscript" },
  { label: "x₁", insert: "_{1}", name: "Subscript" },
  { label: "√x", insert: "\\sqrt{x}", name: "Square root" },
  { label: "±", insert: "\\pm ", name: "Plus or minus" },
  { label: "×", insert: "\\times ", name: "Times" },
  { label: "÷", insert: "\\div ", name: "Divide" },
  { label: "≤", insert: "\\le ", name: "Less than or equal" },
  { label: "≥", insert: "\\ge ", name: "Greater than or equal" },
  { label: "≠", insert: "\\ne ", name: "Not equal" },
  { label: "π", insert: "\\pi ", name: "Pi" },
  { label: "θ", insert: "\\theta ", name: "Theta" },
  { label: "λ", insert: "\\lambda ", name: "Lambda" },
  { label: "Δ", insert: "\\Delta ", name: "Delta" },
  { label: "°", insert: "^{\\circ}", name: "Degree" },
];

export interface EquationResult {
  latex: string;
  display: boolean;
}

/** LaTeX with a live preview and buttons for common symbols. */
export function EquationDialog({
  open,
  initial,
  onInsert,
  onClose,
}: {
  open: boolean;
  initial: EquationResult;
  onInsert: (result: EquationResult) => void;
  onClose: () => void;
}) {
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [latex, setLatex] = useState(initial.latex);
  const [display, setDisplay] = useState(initial.display);
  useEffect(() => {
    if (!open) return;
    setLatex(initial.latex);
    setDisplay(initial.display);
  }, [open, initial.latex, initial.display]);

  const addSymbol = (text: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? latex.length;
    const end = input?.selectionEnd ?? latex.length;
    const next = latex.slice(0, start) + text + latex.slice(end);
    setLatex(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <Modal
      open={open}
      title="Insert equation"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onInsert({ latex: latex.trim(), display })} disabled={!latex.trim()}>
            Insert
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label htmlFor={`${ids}-latex`} className={labelClasses}>
          LaTeX
        </label>
        <input
          id={`${ids}-latex`}
          ref={inputRef}
          type="text"
          value={latex}
          placeholder="N = \frac{D^2 f}{4v}"
          onChange={(event) => setLatex(event.target.value)}
          className={`${inputClasses} font-mono`}
        />
        <div className="flex flex-wrap gap-1.5">
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol.name}
              type="button"
              aria-label={symbol.name}
              title={symbol.name}
              onClick={() => addSymbol(symbol.insert)}
              className="h-9 min-w-10 rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              {symbol.label}
            </button>
          ))}
        </div>
        <div
          aria-live="polite"
          className="flex min-h-16 items-center justify-center rounded-md bg-slate-50 p-3 text-lg dark:bg-neutral-800"
        >
          {latex.trim() ? (
            <RichText text={`$$${latex.trim()}$$`} />
          ) : (
            <span className="text-sm text-slate-500 dark:text-neutral-400">The equation appears here.</span>
          )}
        </div>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className={`${labelClasses} mb-1.5`}>Placement</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name={`${ids}-place`} checked={!display} onChange={() => setDisplay(false)} className="accent-brand-500" />
            In the sentence
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={`${ids}-place`} checked={display} onChange={() => setDisplay(true)} className="accent-brand-500" />
            On its own line
          </label>
        </fieldset>
      </div>
    </Modal>
  );
}

/** A grid of cells to build or change a Markdown table without typing pipes. */
export function TableDialog({
  open,
  initial,
  editing,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: TableCells;
  /** True when the caret was in an existing table, which this replaces. */
  editing: boolean;
  onSave: (cells: TableCells) => void;
  onClose: () => void;
}) {
  const [cells, setCells] = useState<TableCells>(initial);
  useEffect(() => {
    if (open) setCells(initial);
  }, [open, initial]);
  const columns = cells[0]?.length ?? 0;
  const set = (row: number, column: number, value: string) =>
    setCells((current) => current.map((r, i) => (i === row ? r.map((c, j) => (j === column ? value : c)) : r)));

  return (
    <Modal
      open={open}
      title={editing ? "Edit table" : "Insert table"}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(cells)}>{editing ? "Update table" : "Insert table"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1">
            <tbody>
              {cells.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex}>
                      <input
                        type="text"
                        aria-label={rowIndex === 0 ? `Header ${columnIndex + 1}` : `Row ${rowIndex}, column ${columnIndex + 1}`}
                        value={cell}
                        onChange={(event) => set(rowIndex, columnIndex, event.target.value)}
                        className={`${inputClasses} min-w-[8rem] ${rowIndex === 0 ? "font-semibold" : ""}`}
                      />
                    </td>
                  ))}
                  <td>
                    <IconButton
                      label={rowIndex === 0 ? "The header row stays" : `Remove row ${rowIndex}`}
                      disabled={rowIndex === 0}
                      onClick={() => setCells((current) => current.filter((_, i) => i !== rowIndex))}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </td>
                </tr>
              ))}
              <tr>
                {Array.from({ length: columns }, (_, columnIndex) => (
                  <td key={columnIndex} className="text-center">
                    <IconButton
                      label={`Remove column ${columnIndex + 1}`}
                      disabled={columns <= 1}
                      onClick={() => setCells((current) => current.map((row) => row.filter((_, j) => j !== columnIndex)))}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCells((current) => [...current, Array<string>(columns).fill("")])}>
            + Row
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCells((current) => current.map((row) => [...row, ""]))}>
            + Column
          </Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          The first row is the header. Cells can hold equations like $x^2$, bold, and code.
        </p>
      </div>
    </Modal>
  );
}
