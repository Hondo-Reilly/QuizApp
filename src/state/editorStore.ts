import { create } from "zustand";
import type { Quiz, QuizAssetUpload } from "@shared/types";

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
  /**
   * Whether Save has been tried since the quiz was loaded or last saved.
   * Issues stay hidden until then, so a half-written question isn't flagged
   * while it is still being written.
   */
  saveAttempted: boolean;
  /**
   * Images added since the last save, by path, with a URL to show them. They
   * are kept even when an edit stops using them, so undo can bring them back.
   */
  pending: Record<string, { data: Uint8Array; url: string }>;
  /**
   * Starts editing a quiz. `savedAs` is what counts as saved when it differs
   * from the quiz, as for a new quiz started from the example or pasted JSON.
   */
  load: (quiz: Quiz, savedAs?: Quiz) => void;
  /**
   * Set before leaving for a practice run, so the editor keeps its draft,
   * history, and images and picks them up again on return.
   */
  keepOnLeave: boolean;
  setKeepOnLeave: (keep: boolean) => void;
  /**
   * Applies an edit. Edits with the same key in quick succession, such as
   * typing into one field, undo together.
   */
  apply: (change: (quiz: Quiz) => Quiz, key?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string) => void;
  markSaved: (quiz: Quiz) => void;
  attemptSave: () => void;
  addPending: (upload: QuizAssetUpload) => void;
  /** Drops images that are now stored with the quiz. */
  clearPending: (paths: readonly string[]) => void;
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
  saveAttempted: false,
  keepOnLeave: false,
  pending: {} as Record<string, { data: Uint8Array; url: string }>,
};

function revoke(pending: EditorState["pending"], paths: readonly string[]): void {
  for (const path of paths) {
    const url = pending[path]?.url;
    if (url) URL.revokeObjectURL(url);
  }
}

/** Keeps the selection on something that still exists after undo or redo. */
function validSelection(quiz: Quiz, selected: string): string {
  if (selected === DETAILS) return selected;
  return quiz.questions.some((question) => question.id === selected) ? selected : DETAILS;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...empty,

  load: (quiz, savedAs) => {
    revoke(get().pending, Object.keys(get().pending));
    const savedJson = JSON.stringify(savedAs ?? quiz);
    set({
      ...empty,
      draft: quiz,
      savedJson,
      dirty: JSON.stringify(quiz) !== savedJson,
      selected: quiz.questions[0]?.id ?? DETAILS,
    });
  },

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
    set({
      savedJson,
      dirty: draft ? JSON.stringify(draft) !== savedJson : false,
      lastKey: null,
      saveAttempted: false,
    });
  },

  attemptSave: () => set({ saveAttempted: true }),

  setKeepOnLeave: (keep) => set({ keepOnLeave: keep }),

  addPending: ({ path, data }) => {
    const url = URL.createObjectURL(new Blob([data as BlobPart]));
    set({ pending: { ...get().pending, [path]: { data, url } } });
  },

  clearPending: (paths) => {
    const pending = { ...get().pending };
    revoke(pending, paths);
    for (const path of paths) delete pending[path];
    set({ pending });
  },

  reset: () => {
    revoke(get().pending, Object.keys(get().pending));
    set(empty);
  },
}));
