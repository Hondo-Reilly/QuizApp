import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_DELAY_MS = 300;

/**
 * Keeps typed text local and saves it after a short pause, when the field loses
 * focus, or when it unmounts. While the user is typing, updates arriving from
 * elsewhere (such as the phone in mobile mode echoing an older copy) are ignored,
 * so they can't overwrite newer text or move the caret.
 */
export function useTextDraft(
  value: string,
  save: (next: string) => void,
): { draft: string; change: (next: string) => void; flush: () => void } {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (dirty.current) return;
    draftRef.current = value;
    setDraft(value);
  }, [value]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    saveRef.current(draftRef.current);
  }, []);

  const change = useCallback(
    (next: string) => {
      dirty.current = true;
      draftRef.current = next;
      setDraft(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => flush, [flush]);

  return { draft, change, flush };
}
