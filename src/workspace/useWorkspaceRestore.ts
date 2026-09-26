import { useEffect, useRef } from "react";
import { parseWardRecords } from "../api/validation";
import { defaultDataset, isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import { clusterDataVersion, wardDataVersion } from "../dataset/storage";
import { getAnalysis, getSetting } from "../indexedDb";
import { autoViewSettingKey, normalizeSavedViewState } from "../savedViews/viewState";
import type { ViewState } from "../savedViews/viewState";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import type { League } from "../types";
import type { BooleanRef } from "./useDatasetLoader";
import useViewRestoration from "./useViewRestoration";

interface WorkspaceRestoreOptions {
  compatibleDataset: (dataset: DatasetSettings) => DatasetSettings;
  defaultLeague: League | null;
  loadDataset: (dataset: DatasetSettings, forceRefresh: boolean) => Promise<void>;
  ready: boolean;
  restoredClusters: BooleanRef;
}

export default function useWorkspaceRestore({
  compatibleDataset,
  defaultLeague,
  loadDataset,
  ready,
  restoredClusters,
}: WorkspaceRestoreOptions): BooleanRef {
  const autoViewReady = useRef(false);
  const { applyWorkspaceSettings, restorePresentation } = useViewRestoration();
  const { setDataLoadProgress, setDatasetSnapshot, setDraftDataset, setLoadingData } =
    useWorkspaceActions();

  function applyViewState(state: ViewState) {
    restorePresentation(state);
    autoViewReady.current = true;
  }

  useEffect(() => {
    if (!ready || !defaultLeague) {
      return;
    }

    let active = true;
    const initialDataset = { ...defaultDataset, leagueIds: [defaultLeague.id] };

    setLoadingData(true);
    setDataLoadProgress(null);
    setDatasetSnapshot(null, [], null);

    void Promise.all([getAnalysis("workspace:last"), getSetting(autoViewSettingKey)])
      .then(async ([session, storedAutoView]) => {
        if (!active) {
          return;
        }

        const autoView = normalizeSavedViewState(storedAutoView);
        const cachedView = session ? normalizeSavedViewState(session.settings) : null;
        const state = autoView ?? cachedView;

        if (!state) {
          setDraftDataset(initialDataset);
          setDatasetSnapshot(null, [], null);
          await loadDataset(initialDataset, false);
          autoViewReady.current = true;

          return;
        }

        const settings = state.workspace;
        const normalizedDataset = normalizeDataset(settings.dataset, defaultLeague.id);
        const dataset = compatibleDataset(normalizedDataset);
        const removedIncompatibleLeagues =
          dataset.leagueIds.length !== normalizedDataset.leagueIds.length;

        setDraftDataset(dataset);
        applyWorkspaceSettings(state);

        const cachedSettingsMatch = Boolean(
          cachedView && JSON.stringify(cachedView.workspace) === JSON.stringify(settings),
        );
        const canRestoreCache = Boolean(
          session &&
          isClusterSets(session.clusterSets) &&
          cachedSettingsMatch &&
          !removedIncompatibleLeagues &&
          settings.wardDataVersion === wardDataVersion,
        );

        if (!canRestoreCache || !session) {
          setDatasetSnapshot(null, [], null);
          await loadDataset(dataset, false);

          if (active) {
            applyViewState(state);
          }

          return;
        }

        let restoredWards;

        try {
          restoredWards = parseWardRecords(session.wards);
        } catch {
          setDatasetSnapshot(null, [], null);
          await loadDataset(dataset, false);

          if (active) {
            applyViewState(state);
          }

          return;
        }

        if (!active) {
          return;
        }

        const clustersMatchCurrentModel = settings.clusterDataVersion === clusterDataVersion;

        restoredClusters.current = clustersMatchCurrentModel;
        setDatasetSnapshot(
          dataset,
          restoredWards,
          clustersMatchCurrentModel ? session.clusterSets! : null,
          session.leagueFreshness ?? null,
        );
        setLoadingData(false);
        applyViewState(state);
      })
      .catch(async () => {
        await loadDataset(initialDataset, false);
        autoViewReady.current = true;
      });

    return () => {
      active = false;
    };
  }, [defaultLeague?.id, ready]);

  return autoViewReady;
}
