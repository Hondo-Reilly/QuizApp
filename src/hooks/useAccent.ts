import { useCallback, useEffect, useState } from "react";
import {
  applyAccent,
  readInitialAccent,
  rememberAccent,
  type Accent,
} from "@/lib/accent";

export function useAccent() {
  const [accent, setAccentState] = useState<Accent>(readInitialAccent);

  useEffect(() => {
    applyAccent(accent);
    rememberAccent(accent);
  }, [accent]);

  const setAccent = useCallback((next: Accent) => setAccentState(next), []);

  return { accent, setAccent };
}
