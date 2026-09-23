import { useCallback, useEffect, useState } from "react";
import { sendMobilePatch } from "@/lib/mobileSync";
import { applyTheme, readInitialTheme, rememberTheme, withTheme, type Theme } from "@/lib/theme";
import { useMobileStore } from "@/state/mobileStore";

export type { Theme };

export interface UseTheme {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): UseTheme {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    rememberTheme(theme);
    const mobile = useMobileStore.getState();
    if (!mobile.active) return;
    if (mobile.url) {
      const next = withTheme(mobile.url, theme);
      if (next !== mobile.url) useMobileStore.getState().setUrl(next);
    }
    void sendMobilePatch({ type: "theme", theme }).catch(() => undefined);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, isDark: theme === "dark", toggle, setTheme };
}
