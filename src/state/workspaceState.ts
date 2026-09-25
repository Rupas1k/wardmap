import { create } from "zustand";
import type { StoredAnalysis } from "../indexedDb";
import type { LeagueFreshness } from "../indexedDb";
import type { ClusterSets, League, Player, Team, Ward, WardPopulation } from "../types";
import { defaultDataset } from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import { emptyAnalysisContext, sameScope } from "./analysisContext";
import type { AnalysisContext, AnalysisScope, ContextStatus } from "./analysisContext";
import type { WardLoadProgress } from "../api/fetchWards";
import { normalizeLocationKeys } from "../locations/locationIdentity";
import { compatibleManualLocations, manualLocationId } from "../locations/manualLocations";
import type { ManualLocation } from "../locations/manualLocations";
import type { ViewState } from "../savedViews/viewState";

export type InspectorTab = "overview" | "locations" | "details";
export type InspectorReturnTab = Exclude<InspectorTab, "details">;
export type LocationSort =
  "wards" | "matches" | "removals" | "placement" | "lifetime" | "added-vision" | "fresh-sightings";
export type SortDirection = "ascending" | "descending";
export type LocationView = "locations" | "players" | "matches";
export type WardView = "wards" | "players" | "matches";
export type WardOutcomeFilter =
  "all" | "dewarded" | "expired" | "allied_removed" | "match_ended" | "unresolved_removal";
export type WardSort =
  "amount" | "placement" | "lifetime" | "match" | "player" | "added-vision" | "fresh-sightings";
type Update<T> = T | ((current: T) => T);
export interface LocationReselection {
  changedWardIds: number[];
  kind: "exclude" | "restore";
  sourceFingerprint: string | null;
  wardIds: number[];
}

export interface LocationChangeUndo {
  excludedWardIds: number[];
  hiddenLocationFingerprints: string[];
  manualLocations: ManualLocation[];
}

function resolve<T>(current: T, update: Update<T>): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

function validWardId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function locationUndoSnapshot(state: WorkspaceState): LocationChangeUndo {
  return {
    excludedWardIds: state.excludedWardIds,
    hiddenLocationFingerprints: state.hiddenLocationFingerprints,
    manualLocations: state.manualLocations,
  };
}

export interface WorkspaceState {
  leagues: League[];
  draftDataset: DatasetSettings;
  loadedDataset: DatasetSettings | null;
  wards: Ward[];
  clusterSets: ClusterSets | null;
  contextClusterSets: ClusterSets | null;
  loadedLeagueFreshness: LeagueFreshness | null;
  population: WardPopulation | null;
  savedViews: StoredAnalysis<ViewState>[];
  teams: Team[];
  players: Player[];
  opponentPlayers: Player[];
  controlsOpen: boolean;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  inspectorReturnTab: InspectorReturnTab;
  locationSort: LocationSort;
  locationSortDirection: SortDirection;
  locationMinimumWards: number;
  locationView: LocationView;
  analysisContext: AnalysisContext;
  wardView: WardView;
  wardOutcomeFilter: WardOutcomeFilter;
  wardSort: WardSort;
  selectedWardIds: number[];
  excludedWardIds: number[];
  locationChangeUndo: LocationChangeUndo | null;
  hiddenLocationFingerprints: string[];
  locationNames: Record<string, string>;
  manualLocations: ManualLocation[];
  pendingLocationReselection: LocationReselection | null;
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
  setSavedViews: (views: Update<StoredAnalysis<ViewState>[]>) => void;
  setMetadata: (teams: Team[], players: Player[], opponentPlayers: Player[]) => void;
  setDatasetSnapshot: (
    dataset: DatasetSettings | null,
    wards: Ward[],
    clusterSets: ClusterSets | null,
    leagueFreshness?: LeagueFreshness | null,
    population?: WardPopulation | null,
  ) => void;
  setControlsOpen: (open: Update<boolean>) => void;
  setInspectorOpen: (open: Update<boolean>) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setLocationSort: (sort: LocationSort) => void;
  setLocationSortDirection: (direction: SortDirection) => void;
  setLocationMinimumWards: (minimum: number) => void;
  setLocationView: (view: LocationView) => void;
  setContextOrigin: (scope: AnalysisScope | null) => void;
  setContextRefinement: (scope: AnalysisScope | null) => void;
  setContextStatus: (status: ContextStatus) => void;
  setWardView: (view: WardView) => void;
  setWardOutcomeFilter: (outcome: WardOutcomeFilter) => void;
  setWardSort: (sort: WardSort) => void;
  toggleWardSelection: (wardId: number) => void;
  toggleWardSelectionGroup: (wardIds: number[]) => void;
  clearWardSelectionSet: () => void;
  excludeWard: (wardId: number) => void;
  excludeWards: (wardIds: number[]) => void;
  undoLocationChange: () => void;
  restoreWard: (wardId: number) => void;
  restoreWards: (wardIds: number[]) => void;
  hideLocation: (fingerprint: string) => void;
  restoreLocation: (fingerprint: string) => void;
  restoreLocations: (fingerprints: string[]) => void;
  setLocationName: (fingerprint: string, name: string | null) => void;
  mergeWardsIntoManualLocation: (wardIds: number[], preferredId?: string | null) => string | null;
  removeWardsFromManualLocation: (id: string, wardIds: number[]) => boolean;
  removeManualLocation: (id: string) => void;
  setManualLocationName: (id: string, name: string | null) => void;
  copyLocationName: (sourceFingerprint: string, targetFingerprint: string) => void;
  setLocationChanges: (
    excludedWardIds: number[],
    hiddenLocationFingerprints: string[],
    locationNames: Record<string, string>,
    manualLocations?: ManualLocation[],
  ) => void;
  setPendingLocationReselection: (request: LocationReselection | null) => void;
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
  population: null,
  savedViews: [],
  teams: [],
  players: [],
  opponentPlayers: [],
  controlsOpen: true,
  inspectorOpen: true,
  inspectorTab: "overview",
  inspectorReturnTab: "overview",
  locationSort: "wards",
  locationSortDirection: "descending",
  locationMinimumWards: 3,
  locationView: "locations",
  analysisContext: emptyAnalysisContext,
  wardView: "wards",
  wardOutcomeFilter: "all",
  wardSort: "placement",
  selectedWardIds: [],
  excludedWardIds: [],
  locationChangeUndo: null,
  hiddenLocationFingerprints: [],
  locationNames: {},
  manualLocations: [],
  pendingLocationReselection: null,
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
    set((state) => {
      const availableWardIds = new Set(wards.map((ward) => ward.id));

      return {
        wards,
        contextClusterSets: null,
        analysisContext: emptyAnalysisContext,
        pendingLocationReselection: null,
        selectedWardIds: state.selectedWardIds.filter((id) => availableWardIds.has(id)),
        manualLocations: compatibleManualLocations(state.manualLocations, wards),
        locationChangeUndo: null,
      };
    }),
  setClusterSets: (clusterSets) => set({ clusterSets }),
  setContextClusterSets: (contextClusterSets) => set({ contextClusterSets }),
  setLoadedLeagueFreshness: (loadedLeagueFreshness) => set({ loadedLeagueFreshness }),
  setSavedViews: (update) => set((state) => ({ savedViews: resolve(state.savedViews, update) })),
  setMetadata: (teams, players, opponentPlayers) => set({ teams, players, opponentPlayers }),
  setDatasetSnapshot: (
    loadedDataset,
    wards,
    clusterSets,
    loadedLeagueFreshness = null,
    population = null,
  ) =>
    set((state) => {
      const availableWardIds = new Set(wards.map((ward) => ward.id));

      return {
        loadedDataset,
        wards,
        clusterSets,
        contextClusterSets: null,
        analysisContext: emptyAnalysisContext,
        loadedLeagueFreshness,
        population,
        pendingLocationReselection: null,
        selectedWardIds: state.selectedWardIds.filter((id) => availableWardIds.has(id)),
        manualLocations: compatibleManualLocations(state.manualLocations, wards),
        locationChangeUndo: null,
      };
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
  setLocationSortDirection: (locationSortDirection) => set({ locationSortDirection }),
  setLocationMinimumWards: (locationMinimumWards) => set({ locationMinimumWards }),
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
  toggleWardSelection: (wardId) => {
    if (!validWardId(wardId)) {
      return;
    }

    set((state) => {
      if (!state.wards.some((ward) => ward.id === wardId)) {
        return state;
      }

      return {
        selectedWardIds: state.selectedWardIds.includes(wardId)
          ? state.selectedWardIds.filter((id) => id !== wardId)
          : [...state.selectedWardIds, wardId],
      };
    });
  },
  toggleWardSelectionGroup: (wardIds) =>
    set((state) => {
      const available = new Set(state.wards.map((ward) => ward.id));
      const excluded = new Set(state.excludedWardIds);
      const group = [
        ...new Set(
          wardIds.filter((id) => validWardId(id) && available.has(id) && !excluded.has(id)),
        ),
      ];

      if (group.length === 0) {
        return state;
      }

      const selected = new Set(state.selectedWardIds);
      const groupSelected = group.every((id) => selected.has(id));

      if (groupSelected) {
        const groupIds = new Set(group);

        return { selectedWardIds: state.selectedWardIds.filter((id) => !groupIds.has(id)) };
      }

      return { selectedWardIds: [...new Set([...state.selectedWardIds, ...group])] };
    }),
  clearWardSelectionSet: () => set({ selectedWardIds: [] }),
  excludeWard: (wardId) =>
    set((state) => ({
      excludedWardIds: [...new Set([...state.excludedWardIds, wardId])],
      locationChangeUndo: state.excludedWardIds.includes(wardId)
        ? state.locationChangeUndo
        : locationUndoSnapshot(state),
      selectedWardIds: state.selectedWardIds.filter((id) => id !== wardId),
    })),
  excludeWards: (wardIds) =>
    set((state) => {
      const available = new Set(state.wards.map((ward) => ward.id));
      const alreadyExcluded = new Set(state.excludedWardIds);
      const excluded = [
        ...new Set(
          wardIds.filter((id) => validWardId(id) && available.has(id) && !alreadyExcluded.has(id)),
        ),
      ];

      return {
        excludedWardIds: [...new Set([...state.excludedWardIds, ...excluded])],
        locationChangeUndo:
          excluded.length > 0 ? locationUndoSnapshot(state) : state.locationChangeUndo,
        selectedWardIds: [],
      };
    }),
  undoLocationChange: () =>
    set((state) =>
      state.locationChangeUndo
        ? {
            excludedWardIds: state.locationChangeUndo.excludedWardIds,
            hiddenLocationFingerprints: state.locationChangeUndo.hiddenLocationFingerprints,
            manualLocations: state.locationChangeUndo.manualLocations,
            locationChangeUndo: null,
            pendingLocationReselection: null,
          }
        : state,
    ),
  restoreWard: (wardId) =>
    set((state) => ({
      excludedWardIds: state.excludedWardIds.filter((id) => id !== wardId),
      locationChangeUndo: state.excludedWardIds.includes(wardId)
        ? locationUndoSnapshot(state)
        : state.locationChangeUndo,
    })),
  restoreWards: (wardIds) =>
    set((state) => {
      const restored = new Set(wardIds.filter((id) => state.excludedWardIds.includes(id)));

      if (restored.size === 0) {
        return state;
      }

      return {
        excludedWardIds: state.excludedWardIds.filter((id) => !restored.has(id)),
        locationChangeUndo: locationUndoSnapshot(state),
      };
    }),
  hideLocation: (fingerprint) =>
    set((state) => ({
      hiddenLocationFingerprints: [...new Set([...state.hiddenLocationFingerprints, fingerprint])],
      locationChangeUndo: state.hiddenLocationFingerprints.includes(fingerprint)
        ? state.locationChangeUndo
        : locationUndoSnapshot(state),
    })),
  restoreLocation: (fingerprint) =>
    set((state) => ({
      hiddenLocationFingerprints: state.hiddenLocationFingerprints.filter(
        (candidate) => candidate !== fingerprint,
      ),
      locationChangeUndo: state.hiddenLocationFingerprints.includes(fingerprint)
        ? locationUndoSnapshot(state)
        : state.locationChangeUndo,
    })),
  restoreLocations: (fingerprints) =>
    set((state) => {
      const restored = new Set(
        fingerprints.filter((fingerprint) =>
          state.hiddenLocationFingerprints.includes(fingerprint),
        ),
      );

      if (restored.size === 0) {
        return state;
      }

      return {
        hiddenLocationFingerprints: state.hiddenLocationFingerprints.filter(
          (fingerprint) => !restored.has(fingerprint),
        ),
        locationChangeUndo: locationUndoSnapshot(state),
      };
    }),
  setLocationName: (fingerprint, name) =>
    set((state) => {
      const locationNames = { ...state.locationNames };

      if (name) {
        locationNames[fingerprint] = name;
      } else {
        delete locationNames[fingerprint];
      }

      return { locationNames };
    }),
  mergeWardsIntoManualLocation: (wardIds, preferredId = null) => {
    let mergedId: string | null = null;

    set((state) => {
      const selectedIds = [...new Set(wardIds.filter(validWardId))].sort(
        (left, right) => left - right,
      );
      const selectedIdSet = new Set(selectedIds);
      const wardsById = new Map(state.wards.map((ward) => [ward.id, ward]));
      const selectedWards = selectedIds.flatMap((id) => {
        const ward = wardsById.get(id);

        return ward ? [ward] : [];
      });

      if (
        selectedWards.length !== selectedIds.length ||
        new Set(selectedWards.map((ward) => ward.is_obs)).size > 1
      ) {
        return state;
      }

      const sourceLocations = state.manualLocations.filter((location) =>
        location.wardIds.some((id) => selectedIdSet.has(id)),
      );
      const target =
        sourceLocations.find((location) => location.id === preferredId) ??
        sourceLocations[0] ??
        null;
      const mergedWardIds = [...new Set([...(target?.wardIds ?? []), ...selectedIds])].sort(
        (left, right) => left - right,
      );
      const mergedWards = mergedWardIds.flatMap((id) => {
        const ward = wardsById.get(id);

        return ward ? [ward] : [];
      });

      if (
        mergedWardIds.length < 2 ||
        mergedWards.length !== mergedWardIds.length ||
        new Set(mergedWards.map((ward) => ward.is_obs)).size > 1
      ) {
        return state;
      }

      mergedId = target?.id ?? manualLocationId();
      const mergedLocation = {
        id: mergedId,
        name: target?.name ?? null,
        wardIds: mergedWardIds,
      };
      const remainingLocations = state.manualLocations.flatMap((location) => {
        if (location.id === target?.id) {
          return [];
        }

        const remainingWardIds = location.wardIds.filter((id) => !selectedIdSet.has(id));

        return remainingWardIds.length >= 2 ? [{ ...location, wardIds: remainingWardIds }] : [];
      });

      return {
        manualLocations: [...remainingLocations, mergedLocation],
        locationChangeUndo: locationUndoSnapshot(state),
        selectedWardIds: [],
      };
    });

    return mergedId;
  },
  removeWardsFromManualLocation: (id, wardIds) => {
    let changed = false;

    set((state) => {
      const location = state.manualLocations.find((candidate) => candidate.id === id);

      if (!location) {
        return state;
      }

      const removedIds = new Set(wardIds.filter(validWardId));

      if (
        removedIds.size === 0 ||
        [...removedIds].some((wardId) => !location.wardIds.includes(wardId))
      ) {
        return state;
      }

      const remainingIds = location.wardIds.filter((wardId) => !removedIds.has(wardId));
      changed = true;

      return {
        manualLocations:
          remainingIds.length < 2
            ? state.manualLocations.filter((candidate) => candidate.id !== id)
            : state.manualLocations.map((candidate) =>
                candidate.id === id ? { ...candidate, wardIds: remainingIds } : candidate,
              ),
        locationChangeUndo: locationUndoSnapshot(state),
        selectedWardIds: [],
      };
    });

    return changed;
  },
  removeManualLocation: (id) =>
    set((state) => {
      const manualLocations = state.manualLocations.filter((location) => location.id !== id);

      return manualLocations.length === state.manualLocations.length
        ? state
        : {
            manualLocations,
            locationChangeUndo: locationUndoSnapshot(state),
          };
    }),
  setManualLocationName: (id, name) =>
    set((state) => {
      const normalizedName = name?.trim().slice(0, 80) || null;

      return {
        manualLocations: state.manualLocations.map((location) =>
          location.id === id ? { ...location, name: normalizedName } : location,
        ),
      };
    }),
  copyLocationName: (sourceFingerprint, targetFingerprint) =>
    set((state) => {
      const name = state.locationNames[sourceFingerprint];

      if (!name || sourceFingerprint === targetFingerprint) {
        return state;
      }

      return { locationNames: { ...state.locationNames, [targetFingerprint]: name } };
    }),
  setLocationChanges: (
    excludedWardIds,
    hiddenLocationFingerprints,
    locationNames,
    manualLocations = [],
  ) =>
    set({
      excludedWardIds,
      hiddenLocationFingerprints: normalizeLocationKeys(hiddenLocationFingerprints),
      locationNames,
      manualLocations,
      locationChangeUndo: null,
    }),
  setPendingLocationReselection: (pendingLocationReselection) =>
    set({ pendingLocationReselection }),
  setClusteringEnabled: (clusteringEnabled) => set({ clusteringEnabled }),
  setGroupByGridCell: (groupByGridCell) => set({ groupByGridCell }),
  setShowUnclustered: (showUnclustered) => set({ showUnclustered }),
  setReady: (ready) => set({ ready }),
  setLoadingData: (loadingData) => set({ loadingData }),
  setDataLoadProgress: (dataLoadProgress) => set({ dataLoadProgress }),
  setClustering: (clustering) => set({ clustering }),
  setError: (error) => set({ error }),
}));
