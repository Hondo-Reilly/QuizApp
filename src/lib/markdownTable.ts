/** A table as rows of cells; the first row is the header. */
export type TableCells = string[][];

const SEPARATOR = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

function isTableLine(line: string): boolean {
  return line.includes("|") && line.trim() !== "";
}

/** Splits a table row on unescaped pipes, dropping the outer ones. */
function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && text[i + 1] === "|") {
      current += "|";
      i += 1;
    } else if (text[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += text[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Every row padded to the same number of columns, with at least one. */
function squared(rows: TableCells): TableCells {
  const width = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => [...row, ...Array<string>(width - row.length).fill("")]);
}

export function parseTable(markdown: string): TableCells | null {
  const lines = markdown.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2 || !SEPARATOR.test(lines[1])) return null;
  return squared([lines[0], ...lines.slice(2)].map(splitRow));
}

export function formatTable(rows: TableCells): string {
  const cells = squared(rows).map((row) =>
    row.map((cell) => cell.replace(/\|/g, "\\|").replace(/\n/g, " ").trim()),
  );
  const line = (row: string[]) => `| ${row.join(" | ")} |`;
  return [line(cells[0]), line(cells[0].map(() => "---")), ...cells.slice(1).map(line)].join("\n");
}

/** The Markdown table around a caret position: its text range and cells. */
export function tableAt(text: string, caret: number): { start: number; end: number; cells: TableCells } | null {
  const lines = text.split("\n");
  let offset = 0;
  let index = 0;
  for (; index < lines.length; index += 1) {
    if (caret <= offset + lines[index].length) break;
    offset += lines[index].length + 1;
  }
  if (index >= lines.length || !isTableLine(lines[index])) return null;
  let first = index;
  while (first > 0 && isTableLine(lines[first - 1])) first -= 1;
  let last = index;
  while (last < lines.length - 1 && isTableLine(lines[last + 1])) last += 1;
  const cells = parseTable(lines.slice(first, last + 1).join("\n"));
  if (!cells) return null;
  const start = lines.slice(0, first).reduce((sum, line) => sum + line.length + 1, 0);
  const end = start + lines.slice(first, last + 1).join("\n").length;
  return { start, end, cells };
}

/**
 * Cells copied from a spreadsheet: tab-separated columns, one row per line.
 * Returns null for ordinary text.
 */
export function cellsFromSpreadsheet(text: string): TableCells | null {
  const rows = text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  if (rows.length < 2 || !rows.some((row) => row.includes("\t"))) return null;
  return squared(rows.map((row) => row.split("\t").map((cell) => cell.trim())));
}
