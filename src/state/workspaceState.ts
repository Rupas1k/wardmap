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
  message: string;
}

function resolve<T>(current: T, update: Update<T>): T {
  return typeof update === "function" ? (update as (value: T) => T)(current) : update;
}

function validWardId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
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
  clearWardSelectionSet: () => void;
  excludeWard: (wardId: number) => void;
  excludeWards: (wardIds: number[]) => void;
  dismissLocationChange: () => void;
  undoLocationChange: () => void;
  restoreWard: (wardId: number) => void;
  restoreWards: (wardIds: number[]) => void;
  hideLocation: (fingerprint: string) => void;
  restoreLocation: (fingerprint: string) => void;
  restoreLocations: (fingerprints: string[]) => void;
  setLocationName: (fingerprint: string, name: string | null) => void;
  createManualLocation: (wardIds: number[]) => string | null;
  addWardsToManualLocation: (id: string, wardIds: number[]) => boolean;
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
  clearWardSelectionSet: () => set({ selectedWardIds: [] }),
  excludeWard: (wardId) =>
    set((state) => ({
      excludedWardIds: [...new Set([...state.excludedWardIds, wardId])],
      locationChangeUndo: state.excludedWardIds.includes(wardId)
        ? state.locationChangeUndo
        : {
            excludedWardIds: state.excludedWardIds,
            hiddenLocationFingerprints: state.hiddenLocationFingerprints,
            message: "Ward excluded from grouping",
          },
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
          excluded.length > 0
            ? {
                excludedWardIds: state.excludedWardIds,
                hiddenLocationFingerprints: state.hiddenLocationFingerprints,
                message: `${excluded.length.toLocaleString()} ${excluded.length === 1 ? "ward" : "wards"} excluded from grouping`,
              }
            : state.locationChangeUndo,
        selectedWardIds: [],
      };
    }),
  dismissLocationChange: () => set({ locationChangeUndo: null }),
  undoLocationChange: () =>
    set((state) =>
      state.locationChangeUndo
        ? {
            excludedWardIds: state.locationChangeUndo.excludedWardIds,
            hiddenLocationFingerprints: state.locationChangeUndo.hiddenLocationFingerprints,
            locationChangeUndo: null,
          }
        : state,
    ),
  restoreWard: (wardId) =>
    set((state) => ({
      excludedWardIds: state.excludedWardIds.filter((id) => id !== wardId),
      locationChangeUndo: state.excludedWardIds.includes(wardId)
        ? {
            excludedWardIds: state.excludedWardIds,
            hiddenLocationFingerprints: state.hiddenLocationFingerprints,
            message: "Ward restored",
          }
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
        locationChangeUndo: {
          excludedWardIds: state.excludedWardIds,
          hiddenLocationFingerprints: state.hiddenLocationFingerprints,
          message: `${restored.size.toLocaleString()} ${restored.size === 1 ? "ward" : "wards"} restored`,
        },
      };
    }),
  hideLocation: (fingerprint) =>
    set((state) => ({
      hiddenLocationFingerprints: [...new Set([...state.hiddenLocationFingerprints, fingerprint])],
      locationChangeUndo: state.hiddenLocationFingerprints.includes(fingerprint)
        ? state.locationChangeUndo
        : {
            excludedWardIds: state.excludedWardIds,
            hiddenLocationFingerprints: state.hiddenLocationFingerprints,
            message: "Location hidden",
          },
    })),
  restoreLocation: (fingerprint) =>
    set((state) => ({
      hiddenLocationFingerprints: state.hiddenLocationFingerprints.filter(
        (candidate) => candidate !== fingerprint,
      ),
      locationChangeUndo: state.hiddenLocationFingerprints.includes(fingerprint)
        ? {
            excludedWardIds: state.excludedWardIds,
            hiddenLocationFingerprints: state.hiddenLocationFingerprints,
            message: "Location restored",
          }
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
        locationChangeUndo: {
          excludedWardIds: state.excludedWardIds,
          hiddenLocationFingerprints: state.hiddenLocationFingerprints,
          message: `${restored.size.toLocaleString()} ${restored.size === 1 ? "location" : "locations"} restored`,
        },
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
  createManualLocation: (wardIds) => {
    let createdId: string | null = null;

    set((state) => {
      const uniqueIds = [...new Set(wardIds.filter(validWardId))].sort(
        (left, right) => left - right,
      );
      const wardsById = new Map(state.wards.map((ward) => [ward.id, ward]));
      const selectedWards = uniqueIds.map((id) => wardsById.get(id)).filter(Boolean);
      const assignedIds = new Set(state.manualLocations.flatMap((location) => location.wardIds));

      if (
        selectedWards.length < 2 ||
        selectedWards.length !== uniqueIds.length ||
        selectedWards.some((ward) => ward?.is_obs !== selectedWards[0]?.is_obs) ||
        uniqueIds.some((id) => assignedIds.has(id))
      ) {
        return state;
      }

      createdId = manualLocationId();

      return {
        manualLocations: [
          ...state.manualLocations,
          { id: createdId, name: null, wardIds: uniqueIds },
        ],
        selectedWardIds: [],
      };
    });

    return createdId;
  },
  addWardsToManualLocation: (id, wardIds) => {
    let changed = false;

    set((state) => {
      const location = state.manualLocations.find((candidate) => candidate.id === id);

      if (!location) {
        return state;
      }

      const wardsById = new Map(state.wards.map((ward) => [ward.id, ward]));
      const existingWard = location.wardIds.flatMap((wardId) => {
        const ward = wardsById.get(wardId);

        return ward ? [ward] : [];
      })[0];
      const assignedElsewhere = new Set(
        state.manualLocations
          .filter((candidate) => candidate.id !== id)
          .flatMap((candidate) => candidate.wardIds),
      );
      const additionIds = [...new Set(wardIds.filter(validWardId))];
      const additions = additionIds.map((wardId) => ({ id: wardId, ward: wardsById.get(wardId) }));

      if (
        !existingWard ||
        additions.length === 0 ||
        additions.some(
          ({ id: wardId, ward }) =>
            !ward ||
            location.wardIds.includes(wardId) ||
            assignedElsewhere.has(wardId) ||
            ward.is_obs !== existingWard.is_obs,
        )
      ) {
        return state;
      }

      changed = true;

      return {
        manualLocations: state.manualLocations.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                wardIds: [...candidate.wardIds, ...additionIds].sort((left, right) => left - right),
              }
            : candidate,
        ),
        selectedWardIds: [],
      };
    });

    return changed;
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
