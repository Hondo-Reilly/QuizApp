import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { zipStore } from "@/lib/zipStore";
import { downloadExampleQuiz } from "./DownloadExampleButton";

interface SkillEntry {
  name: string;
  label: string;
  detail: string;
}

const SKILLS: SkillEntry[] = [
  { name: "quiz-app-maker", label: "Quiz maker", detail: "Writes quizzes you can import" },
  {
    name: "quiz-attempt-reviewer",
    label: "Attempt reviewer",
    detail: "Grades written answers and plans what to study",
  },
];

// The skill documents are large text, so they load only when one is downloaded.
async function downloadSkill(name: string): Promise<void> {
  const { skillFiles } = await import("./skillFiles");
  const files = skillFiles[name] ?? [];
  const blob = zipStore(files.map((file) => ({ name: `${name}/${file.path}`, text: file.text })));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.skill`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface AiSkillsMenuProps {
  /**
   * The phone header's "More" menu: an icon trigger, plus the example quiz
   * download and the version that the wider header shows elsewhere.
   */
  compact?: boolean;
  version?: string;
}

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-950";

const itemClass =
  "flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:hover:bg-neutral-800 dark:focus:bg-neutral-800";

/** Header menu for downloading QuizApp's Claude skills. */
export function AiSkillsMenu({ compact = false, version }: AiSkillsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  // In the compact menu, the example quiz is the first item.
  const skillOffset = compact ? 1 : 0;

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => !!item);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {compact ? (
        <button
          type="button"
          aria-label="More"
          title="More"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
          className={iconButtonClass}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="currentColor">
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="13" cy="8" r="1.5" />
          </svg>
        </button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          AI Skills
          <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4.5 6 7.5l3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      )}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={compact ? "More" : "Download a Claude skill"}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {compact && (
            <>
              <button
                ref={(el) => {
                  itemRefs.current[0] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadExampleQuiz();
                  setOpen(false);
                }}
                className={itemClass}
              >
                <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                  Download example quiz
                </span>
              </button>
              <div role="separator" className="my-1 border-t border-slate-200 dark:border-neutral-800" />
            </>
          )}
          <p className="px-3 pb-1 pt-2 text-xs text-slate-500 dark:text-neutral-400">
            Download a skill to add to Claude
          </p>
          {SKILLS.map((skill, index) => (
            <button
              key={skill.name}
              ref={(el) => {
                itemRefs.current[index + skillOffset] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                void downloadSkill(skill.name);
                setOpen(false);
              }}
              className={itemClass}
            >
              <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                {skill.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-neutral-400">{skill.detail}</span>
            </button>
          ))}
          {compact && version && (
            <p className="border-t border-slate-200 px-3 pb-1 pt-2 text-xs text-slate-400 dark:border-neutral-800 dark:text-neutral-500">
              QuizApp v{version}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
