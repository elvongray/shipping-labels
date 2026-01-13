import { create } from "zustand";

type SelectionState = {
  selectedIds: Record<string, boolean>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  setMany: (ids: string[], on: boolean) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: {},
  toggle: (id) =>
    set((state) => {
      const next = { ...state.selectedIds };
      const isSelected = Boolean(next[id]);
      if (isSelected) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return { selectedIds: next };
    }),
  selectAll: (ids) =>
    set((state) => {
      const next = { ...state.selectedIds };
      ids.forEach((id) => {
        next[id] = true;
      });
      return { selectedIds: next };
    }),
  clear: () => set({ selectedIds: {} }),
  setMany: (ids, on) =>
    set((state) => {
      const next = { ...state.selectedIds };
      ids.forEach((id) => {
        if (on) {
          next[id] = true;
        } else {
          delete next[id];
        }
      });
      return { selectedIds: next };
    }),
}));
