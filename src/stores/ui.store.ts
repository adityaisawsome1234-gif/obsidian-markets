import { create } from "zustand";

interface UIState {
  activePage: string;
  activeTicker: string | null;
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;
  setActivePage: (page: string) => void;
  setActiveTicker: (ticker: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activePage: "dashboard",
  activeTicker: null,
  commandPaletteOpen: false,
  sidebarCollapsed: false,

  setActivePage: (activePage) => set({ activePage }),
  setActiveTicker: (activeTicker) => set({ activeTicker }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
