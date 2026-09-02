import { create } from "zustand";
import type { StoredAnalysis } from "../indexedDb";
import type { LeagueFreshness } from "../indexedDb";
import type { ClusterSets, League, Player, Team, Ward } from "../types";
import { defaultDataset } from "../dataset/model";
import type { DatasetSettings, WorkspaceSettings } from "../dataset/model";
import { emptyAnalysisContext, sameScope } from "./analysisContext";
import type { AnalysisContext, AnalysisScope, ContextStatus } from "./analysisContext";
import type { WardLoadProgress } from "../api/fetchWards";

export type InspectorTab = "overview" | "locations" | "details";
export type InspectorReturnTab = Exclude<InspectorTab, "details">;
export type LocationSort =
  | "wards"
  | "matches"
  | "survival-high"
  | "survival-low"
  | "placement-early"
  | "placement-late"
  | "lifetime-high";
export type LocationView = "locations" | "players" | "matches";
export type WardView = "wards" | "players" | "matches";
export type WardOutcomeFilter = "all" | "survived" | "dewarded";
export type WardSort = "amount" | "placement" | "lifetime" | "match" | "player";
type Update<T> = T | ((current: T) => T);

function resolve<T>(current: T, update: Update<T>): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

export interface WorkspaceState {
  leagues: League[];
  draftDataset: DatasetSettings;
  loadedDataset: DatasetSettings | null;
  wards: Ward[];
  clusterSets: ClusterSets | null;
  contextClusterSets: ClusterSets | null;
  loadedLeagueFreshness: LeagueFreshness | null;
  savedViews: StoredAnalysis<WorkspaceSettings>[];
  teams: Team[];
  players: Player[];
  opponentPlayers: Player[];
  controlsOpen: boolean;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  inspectorReturnTab: InspectorReturnTab;
  locationSort: LocationSort;
  locationView: LocationView;
  analysisContext: AnalysisContext;
  wardView: WardView;
  wardOutcomeFilter: WardOutcomeFilter;
  wardSort: WardSort;
  clusteringEnabled: boolean;
  groupByGridCell: boolean;
  showUnclustered: boolean;
  ready: boolean;
  loadingData: boolean;
  dataLoadProgress: WardLoadProgress | null;
  clustering: boolean;
  error: string | null;
  setLeagues: (leagues: League[]) => void;
  setDraftDataset: (dataset: Update<DatasetSettings>) => void;
  setLoadedDataset: (dataset: DatasetSettings | null) => void;
  setWards: (wards: Ward[]) => void;
  setClusterSets: (sets: ClusterSets | null) => void;
  setContextClusterSets: (sets: ClusterSets | null) => void;
  setLoadedLeagueFreshness: (freshness: LeagueFreshness | null) => void;
  setSavedViews: (views: Update<StoredAnalysis<WorkspaceSettings>[]>) => void;
  setMetadata: (teams: Team[], players: Player[], opponentPlayers: Player[]) => void;
  setDatasetSnapshot: (
    dataset: DatasetSettings | null,
    wards: Ward[],
    clusterSets: ClusterSets | null,
    leagueFreshness?: LeagueFreshness | null,
  ) => void;
  setControlsOpen: (open: Update<boolean>) => void;
  setInspectorOpen: (open: Update<boolean>) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setLocationSort: (sort: LocationSort) => void;
  setLocationView: (view: LocationView) => void;
  setContextOrigin: (scope: AnalysisScope | null) => void;
  setContextRefinement: (scope: AnalysisScope | null) => void;
  setContextStatus: (status: ContextStatus) => void;
  setWardView: (view: WardView) => void;
  setWardOutcomeFilter: (outcome: WardOutcomeFilter) => void;
  setWardSort: (sort: WardSort) => void;
  setClusteringEnabled: (enabled: boolean) => void;
  setGroupByGridCell: (enabled: boolean) => void;
  setShowUnclustered: (show: boolean) => void;
  setReady: (ready: boolean) => void;
  setLoadingData: (loading: boolean) => void;
  setDataLoadProgress: (progress: WardLoadProgress | null) => void;
  setClustering: (clustering: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  leagues: [],
  draftDataset: defaultDataset,
  loadedDataset: null,
  wards: [],
  clusterSets: null,
  contextClusterSets: null,
  loadedLeagueFreshness: null,
  savedViews: [],
  teams: [],
  players: [],
  opponentPlayers: [],
  controlsOpen: true,
  inspectorOpen: true,
  inspectorTab: "overview",
  inspectorReturnTab: "overview",
  locationSort: "wards",
  locationView: "locations",
  analysisContext: emptyAnalysisContext,
  wardView: "wards",
  wardOutcomeFilter: "all",
  wardSort: "placement",
  clusteringEnabled: true,
  groupByGridCell: false,
  showUnclustered: false,
  ready: false,
  loadingData: false,
  dataLoadProgress: null,
  clustering: false,
  error: null,
  setLeagues: (leagues) => set({ leagues }),
  setDraftDataset: (update) =>
    set((state) => ({ draftDataset: resolve(state.draftDataset, update) })),
  setLoadedDataset: (loadedDataset) => set({ loadedDataset }),
  setWards: (wards) =>
    set({ wards, contextClusterSets: null, analysisContext: emptyAnalysisContext }),
  setClusterSets: (clusterSets) => set({ clusterSets }),
  setContextClusterSets: (contextClusterSets) => set({ contextClusterSets }),
  setLoadedLeagueFreshness: (loadedLeagueFreshness) => set({ loadedLeagueFreshness }),
  setSavedViews: (update) => set((state) => ({ savedViews: resolve(state.savedViews, update) })),
  setMetadata: (teams, players, opponentPlayers) => set({ teams, players, opponentPlayers }),
  setDatasetSnapshot: (loadedDataset, wards, clusterSets, loadedLeagueFreshness = null) =>
    set({
      loadedDataset,
      wards,
      clusterSets,
      contextClusterSets: null,
      analysisContext: emptyAnalysisContext,
      loadedLeagueFreshness,
    }),
  setControlsOpen: (update) =>
    set((state) => ({ controlsOpen: resolve(state.controlsOpen, update) })),
  setInspectorOpen: (update) =>
    set((state) => ({ inspectorOpen: resolve(state.inspectorOpen, update) })),
  setInspectorTab: (inspectorTab) =>
    set((state) => ({
      inspectorTab,
      inspectorReturnTab:
        inspectorTab === "details"
          ? state.inspectorTab === "details"
            ? state.inspectorReturnTab
            : state.inspectorTab
          : inspectorTab,
    })),
  setLocationSort: (locationSort) => set({ locationSort }),
  setLocationView: (locationView) => set({ locationView }),
  setContextOrigin: (origin) =>
    set({
      analysisContext: {
        origin,
        refinement: null,
        status: origin ? "clustering" : "idle",
      },
      contextClusterSets: null,
    }),
  setContextRefinement: (refinement) =>
    set((state) => ({
      analysisContext: {
        ...state.analysisContext,
        refinement:
          refinement && sameScope(state.analysisContext.origin, refinement) ? null : refinement,
      },
    })),
  setContextStatus: (status) =>
    set((state) => ({ analysisContext: { ...state.analysisContext, status } })),
  setWardView: (wardView) => set({ wardView }),
  setWardOutcomeFilter: (wardOutcomeFilter) => set({ wardOutcomeFilter }),
  setWardSort: (wardSort) => set({ wardSort }),
  setClusteringEnabled: (clusteringEnabled) => set({ clusteringEnabled }),
  setGroupByGridCell: (groupByGridCell) => set({ groupByGridCell }),
  setShowUnclustered: (showUnclustered) => set({ showUnclustered }),
  setReady: (ready) => set({ ready }),
  setLoadingData: (loadingData) => set({ loadingData }),
  setDataLoadProgress: (dataLoadProgress) => set({ dataLoadProgress }),
  setClustering: (clustering) => set({ clustering }),
  setError: (error) => set({ error }),
}));
