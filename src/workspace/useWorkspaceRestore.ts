import { useEffect } from "react";
import { parseWardRecords } from "../api/validation";
import {
  defaultDataset,
  isClusterSets,
  isWorkspaceSettings,
  normalizeDataset,
} from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import { clusterDataVersion, wardDataVersion } from "../dataset/storage";
import { getAnalysis } from "../indexedDb";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import type { League } from "../types";
import type { BooleanRef } from "./useDatasetLoader";

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
}: WorkspaceRestoreOptions) {
  const { setClusteringSettings, setVisionTechnique } = useWorkspaceMapSettings();
  const {
    setClusteringEnabled,
    setDataLoadProgress,
    setDatasetSnapshot,
    setDraftDataset,
    setGroupByGridCell,
    setLoadingData,
    setShowUnclustered,
  } = useWorkspaceActions();

  useEffect(() => {
    if (!ready || !defaultLeague) {
      return;
    }

    let active = true;
    const initialDataset = { ...defaultDataset, leagueIds: [defaultLeague.id] };

    setLoadingData(true);
    setDataLoadProgress(null);
    setDatasetSnapshot(null, [], null);

    void getAnalysis("workspace:last")
      .then((session) => {
        if (!active) {
          return;
        }

        if (
          !session ||
          !isWorkspaceSettings(session.settings) ||
          !isClusterSets(session.clusterSets)
        ) {
          setDraftDataset(initialDataset);
          setDatasetSnapshot(null, [], null);
          void loadDataset(initialDataset, false);

          return;
        }

        let restoredWards;

        try {
          restoredWards = parseWardRecords(session.wards);
        } catch {
          void loadDataset(initialDataset, false);

          return;
        }

        const normalizedDataset = normalizeDataset(session.settings.dataset, defaultLeague.id);
        const dataset = compatibleDataset(normalizedDataset);
        const removedIncompatibleLeagues =
          dataset.leagueIds.length !== normalizedDataset.leagueIds.length;

        setDraftDataset(dataset);
        setClusteringSettings(session.settings.clustering);

        if (session.settings.clusteringEnabled !== undefined) {
          setClusteringEnabled(session.settings.clusteringEnabled);
        }
        if (session.settings.groupByGridCell !== undefined) {
          setGroupByGridCell(session.settings.groupByGridCell);
        }
        if (session.settings.showUnclustered !== undefined) {
          setShowUnclustered(session.settings.showUnclustered);
        }

        setVisionTechnique(session.settings.visionTechnique);

        if (removedIncompatibleLeagues || session.settings.wardDataVersion !== wardDataVersion) {
          setDatasetSnapshot(null, [], null);
          void loadDataset(dataset, false);

          return;
        }

        const clustersMatchCurrentModel =
          session.settings.clusterDataVersion === clusterDataVersion;

        restoredClusters.current = clustersMatchCurrentModel;
        setDatasetSnapshot(
          dataset,
          restoredWards,
          clustersMatchCurrentModel ? session.clusterSets : null,
          session.leagueFreshness ?? null,
        );
        setLoadingData(false);
      })
      .catch(() => void loadDataset(initialDataset, false));

    return () => {
      active = false;
    };
  }, [defaultLeague?.id, ready]);
}
