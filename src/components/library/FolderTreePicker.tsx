import type { Folder } from "@shared/types";

export interface FolderTreePickerProps {
  folders: Folder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  disabledIds?: ReadonlySet<string>;
  rootLabel?: string;
}

interface TreeNode {
  folder: Folder;
  depth: number;
  disabled: boolean;
}

function flatten(
  folders: Folder[],
  disabledIds: ReadonlySet<string>,
): TreeNode[] {
  const childrenByParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parentId ?? null;
    const list = childrenByParent.get(key);
    if (list) list.push(f);
    else childrenByParent.set(key, [f]);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const out: TreeNode[] = [];
  const visit = (parentId: string | null, depth: number, ancestorDisabled: boolean) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      const disabled = ancestorDisabled || disabledIds.has(child.id);
      out.push({ folder: child, depth, disabled });
      visit(child.id, depth + 1, disabled);
    }
  };
  visit(null, 0, false);
  return out;
}

function rowClasses(selected: boolean, disabled: boolean): string {
  const base =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors";
  if (disabled) return `${base} cursor-not-allowed text-slate-400 dark:text-neutral-600`;
  if (selected)
    return `${base} bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300`;
  return `${base} text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-neutral-800`;
}

export function FolderTreePicker({
  folders,
  value,
  onChange,
  disabledIds,
  rootLabel = "Library (root)",
}: FolderTreePickerProps) {
  const nodes = flatten(folders, disabledIds ?? new Set());

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 p-1 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={rowClasses(value === null, false)}
      >
        {rootLabel}
      </button>
      {nodes.map(({ folder, depth, disabled }) => (
        <button
          key={folder.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(folder.id)}
          className={rowClasses(value === folder.id, disabled)}
          style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        >
          <span>{folder.name}</span>
        </button>
      ))}
    </div>
  );
}
