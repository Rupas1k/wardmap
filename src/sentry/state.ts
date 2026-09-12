import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { SentryPlacement } from "./planner";
import type { Side } from "../types";

export type SentryTimePreset = "all" | "pregame" | "early" | "mid" | "late";

interface SentryState {
  placingSide: Exclude<Side, "all">;
  sentryCount: number;
  minimumSpacing: number;
  timePreset: SentryTimePreset;
  placements: SentryPlacement[];
  selectedRank: number | null;
  showAllRanges: boolean;
  planning: boolean;
  error: string | null;
  setPlacingSide: (side: Exclude<Side, "all">) => void;
  setSentryCount: (count: number) => void;
  setMinimumSpacing: (spacing: number) => void;
  setTimePreset: (preset: SentryTimePreset) => void;
  setPlacements: (placements: SentryPlacement[]) => void;
  setSelectedRank: (rank: number | null) => void;
  setShowAllRanges: (show: boolean) => void;
  setPlanning: (planning: boolean) => void;
  setError: (error: string | null) => void;
  clearPlan: () => void;
}

export const useSentryStore = create<SentryState>((set) => ({
  placingSide: "radiant",
  sentryCount: 5,
  minimumSpacing: 1000,
  timePreset: "all",
  placements: [],
  selectedRank: null,
  showAllRanges: false,
  planning: false,
  error: null,
  setPlacingSide: (placingSide) =>
    set({ placingSide, placements: [], selectedRank: null, error: null }),
  setSentryCount: (sentryCount) =>
    set({ sentryCount, placements: [], selectedRank: null, error: null }),
  setMinimumSpacing: (minimumSpacing) =>
    set({ minimumSpacing, placements: [], selectedRank: null, error: null }),
  setTimePreset: (timePreset) =>
    set({ timePreset, placements: [], selectedRank: null, error: null }),
  setPlacements: (placements) => set({ placements, selectedRank: placements[0]?.rank ?? null }),
  setSelectedRank: (selectedRank) => set({ selectedRank }),
  setShowAllRanges: (showAllRanges) => set({ showAllRanges }),
  setPlanning: (planning) => set({ planning }),
  setError: (error) => set({ error }),
  clearPlan: () => set({ placements: [], selectedRank: null, planning: false, error: null }),
}));

export function useSentryPlannerState() {
  return useSentryStore(
    useShallow((state) => ({
      placingSide: state.placingSide,
      sentryCount: state.sentryCount,
      minimumSpacing: state.minimumSpacing,
      timePreset: state.timePreset,
      placements: state.placements,
      selectedRank: state.selectedRank,
      showAllRanges: state.showAllRanges,
      planning: state.planning,
      error: state.error,
      setPlacingSide: state.setPlacingSide,
      setSentryCount: state.setSentryCount,
      setMinimumSpacing: state.setMinimumSpacing,
      setTimePreset: state.setTimePreset,
      setPlacements: state.setPlacements,
      setSelectedRank: state.setSelectedRank,
      setShowAllRanges: state.setShowAllRanges,
      setPlanning: state.setPlanning,
      setError: state.setError,
    })),
  );
}
