import { create } from "zustand";
import type { Quiz } from "@shared/types";

/** "details" selects the quiz's own fields; anything else is a question id. */
export const DETAILS = "details";

const HISTORY_LIMIT = 200;
// Typing into one field within this long counts as one step to undo.
const COALESCE_MS = 1500;

interface EditorState {
  draft: Quiz | null;
  /** The draft as last loaded or saved, to tell whether there are unsaved changes. */
  savedJson: string;
  dirty: boolean;
  past: Quiz[];
  future: Quiz[];
  lastKey: string | null;
  lastAt: number;
  selected: string;
  load: (quiz: Quiz) => void;
  /**
   * Applies an edit. Edits with the same key in quick succession, such as
   * typing into one field, undo together.
   */
  apply: (change: (quiz: Quiz) => Quiz, key?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string) => void;
  markSaved: (quiz: Quiz) => void;
  reset: () => void;
}

const empty = {
  draft: null,
  savedJson: "",
  dirty: false,
  past: [] as Quiz[],
  future: [] as Quiz[],
  lastKey: null,
  lastAt: 0,
  selected: DETAILS,
};

/** Keeps the selection on something that still exists after undo or redo. */
function validSelection(quiz: Quiz, selected: string): string {
  if (selected === DETAILS) return selected;
  return quiz.questions.some((question) => question.id === selected) ? selected : DETAILS;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...empty,

  load: (quiz) =>
    set({
      ...empty,
      draft: quiz,
      savedJson: JSON.stringify(quiz),
      selected: quiz.questions[0]?.id ?? DETAILS,
    }),

  apply: (change, key) => {
    const { draft, past, lastKey, lastAt, savedJson } = get();
    if (!draft) return;
    const next = change(draft);
    if (next === draft) return;
    const now = Date.now();
    const coalesce = key !== undefined && key === lastKey && now - lastAt < COALESCE_MS;
    set({
      draft: next,
      dirty: JSON.stringify(next) !== savedJson,
      past: coalesce ? past : [...past, draft].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key ?? null,
      lastAt: now,
    });
  },

  undo: () => {
    const { draft, past, future, savedJson, selected } = get();
    if (!draft || past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      draft: previous,
      dirty: JSON.stringify(previous) !== savedJson,
      past: past.slice(0, -1),
      future: [draft, ...future],
      lastKey: null,
      selected: validSelection(previous, selected),
    });
  },

  redo: () => {
    const { draft, past, future, savedJson, selected } = get();
    if (!draft || future.length === 0) return;
    const [next, ...rest] = future;
    set({
      draft: next,
      dirty: JSON.stringify(next) !== savedJson,
      past: [...past, draft],
      future: rest,
      lastKey: null,
      selected: validSelection(next, selected),
    });
  },

  select: (id) => set({ selected: id, lastKey: null }),

  markSaved: (quiz) => {
    const { draft } = get();
    const savedJson = JSON.stringify(quiz);
    set({ savedJson, dirty: draft ? JSON.stringify(draft) !== savedJson : false, lastKey: null });
  },

  reset: () => set(empty),
}));
