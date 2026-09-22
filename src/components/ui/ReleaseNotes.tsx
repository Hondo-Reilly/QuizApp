function blocksOf(notes: string): string[][] {
  return notes
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.split("\n").map((line) => line.trimEnd()))
    .filter((lines) => lines.some((line) => line.trim().length > 0));
}

function isList(lines: string[]): boolean {
  return lines.every((line) => /^[-*]\s+/.test(line.trim()));
}

export function ReleaseNotes({ notes }: { notes: string | null }) {
  const blocks = notes ? blocksOf(notes) : [];

  return (
    <div className="h-40 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
      {blocks.length === 0 ? (
        <p className="text-slate-500 dark:text-neutral-400">
          This release has no notes.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {blocks.map((lines, index) =>
            isList(lines) ? (
              <ul key={index} className="list-disc space-y-1 pl-5">
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex}>{line.trim().replace(/^[-*]\s+/, "")}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="whitespace-pre-wrap">
                {lines.join("\n")}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
