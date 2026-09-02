import { useEffect, useRef } from "react";
import type { ClusteringSettings } from "../state/mapState";
import type { LeagueFreshness } from "../indexedDb";
import type { ClusterSets, Ward } from "../types";
import clusterWards from "./clusterWards";
import type { DatasetSettings, WorkspaceSettings } from "../dataset/model";
import { persistWorkspace, withStorageVersion } from "../dataset/storage";

interface BooleanRef {
  current: boolean;
}

export default function useClusteringLifecycle({
  clusterSets,
  clustering,
  clusteringEnabled,
  clusteringSettings,
  clustersMatchSettings,
  groupByGridCell,
  loadedDataset,
  loadedLeagueFreshness,
  restoredClusters,
  setClustering,
  setClusterSets,
  setError,
  showUnclustered,
  visionTechnique,
  wards,
}: {
  clusterSets: ClusterSets | null;
  clustering: boolean;
  clusteringEnabled: boolean;
  clusteringSettings: ClusteringSettings;
  clustersMatchSettings: BooleanRef;
  groupByGridCell: boolean;
  loadedDataset: DatasetSettings | null;
  loadedLeagueFreshness: LeagueFreshness | null;
  restoredClusters: BooleanRef;
  setClustering: (clustering: boolean) => void;
  setClusterSets: (sets: ClusterSets | null) => void;
  setError: (error: string | null) => void;
  showUnclustered: boolean;
  visionTechnique: WorkspaceSettings["visionTechnique"];
  wards: Ward[];
}) {
  const run = useRef(0);
  const request = useRef<AbortController | null>(null);
  const persistedSession = useRef<{
    signature: string;
    wards: Ward[];
    clusterSets: ClusterSets;
  } | null>(null);

  useEffect(() => {
    if (!loadedDataset) {
      return;
    }

    if (restoredClusters.current) {
      restoredClusters.current = false;
      clustersMatchSettings.current = true;

      return;
    }

    const currentRun = ++run.current;

    request.current?.abort();

    const controller = new AbortController();
    request.current = controller;
    clustersMatchSettings.current = false;

    setClustering(true);
    setError(null);

    void clusterWards(
      wards,
      clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      controller.signal,
    )
      .then((nextClusterSets) => {
        if (currentRun !== run.current) {
          return;
        }

        clustersMatchSettings.current = true;
        setClusterSets(nextClusterSets);
      })
      .catch((reason: unknown) => {
        if (currentRun === run.current && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to cluster wards");
        }
      })
      .finally(() => {
        if (currentRun === run.current) {
          request.current = null;
          setClustering(false);
        }
      });

    return () => controller.abort();
  }, [
    clusteringEnabled,
    clusteringSettings,
    clustersMatchSettings,
    groupByGridCell,
    loadedDataset,
    restoredClusters,
    setClustering,
    setClusterSets,
    setError,
    wards,
  ]);

  useEffect(() => {
    if (!loadedDataset || !clusterSets || clustering || !clustersMatchSettings.current) {
      return;
    }

    const settings = withStorageVersion({
      dataset: loadedDataset,
      clustering: clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      showUnclustered,
      visionTechnique,
    });
    const signature = JSON.stringify(settings);

    if (
      persistedSession.current?.signature === signature &&
      persistedSession.current.wards === wards &&
      persistedSession.current.clusterSets === clusterSets
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistWorkspace(
        "workspace:last",
        "session",
        "Last workspace",
        settings,
        wards,
        clusterSets,
        loadedLeagueFreshness ?? undefined,
      )
        .then(() => {
          persistedSession.current = { signature, wards, clusterSets };
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? `Unable to save workspace: ${reason.message}`
              : "Unable to save workspace",
          );
        });
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [
    clusterSets,
    clustering,
    clusteringEnabled,
    clusteringSettings,
    clustersMatchSettings,
    groupByGridCell,
    loadedDataset,
    loadedLeagueFreshness,
    setError,
    showUnclustered,
    visionTechnique,
    wards,
  ]);

  useEffect(
    () => () => {
      request.current?.abort();
      run.current += 1;
    },
    [],
  );
}
