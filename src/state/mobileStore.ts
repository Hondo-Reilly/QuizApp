import { create } from "zustand";

interface MobileUiState {
  active: boolean;
  url: string | null;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  markStarted: (url: string) => void;
  markStopped: () => void;
  setUrl: (url: string) => void;
}

export const useMobileStore = create<MobileUiState>((set) => ({
  active: false,
  url: null,
  dialogOpen: false,
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
  markStarted: (url) => set({ active: true, url, dialogOpen: true }),
  markStopped: () => set({ active: false, url: null, dialogOpen: false }),
  setUrl: (url) => set({ url }),
}));
