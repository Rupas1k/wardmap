import { create } from "zustand";
import { emptyImportedLibrary } from "./model";
import type { ImportedLibrary } from "./model";

interface ImportedState {
  library: ImportedLibrary;
  ready: boolean;
  setLibrary: (library: ImportedLibrary) => void;
  setReady: (ready: boolean) => void;
}

export const useImportedStore = create<ImportedState>((set) => ({
  library: emptyImportedLibrary,
  ready: false,
  setLibrary: (library) => set({ library }),
  setReady: (ready) => set({ ready }),
}));
