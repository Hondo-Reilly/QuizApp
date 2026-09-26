import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { zipStore } from "@/lib/zipStore";

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

/** Header menu for downloading QuizApp's Claude skills. */
export function AiSkillsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

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
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Download a Claude skill"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <p className="px-3 pb-1 pt-2 text-xs text-slate-500 dark:text-neutral-400">
            Download a skill to add to Claude
          </p>
          {SKILLS.map((skill, index) => (
            <button
              key={skill.name}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => {
                void downloadSkill(skill.name);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                {skill.label}
              </span>
              <span className="text-xs text-slate-500 dark:text-neutral-400">{skill.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
