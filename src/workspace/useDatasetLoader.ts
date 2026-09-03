import { useCallback, useEffect, useRef } from "react";
import { maximumWardDatasetSize } from "../config";
import { loadWardDataset } from "../dataset/storage";
import type { DatasetSettings } from "../dataset/model";
import { useWorkspaceMapSettings } from "../state/mapSelectors";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import type { League } from "../types";
import { compatibleLeagueDataset } from "./workspaceDataset";

export interface BooleanRef {
  current: boolean;
}

export default function useDatasetLoader(leagues: League[], defaultLeague: League | null) {
  const dataRun = useRef(0);
  const dataRequest = useRef<AbortController | null>(null);
  const restoredClusters = useRef(false);
  const clustersMatchSettings = useRef(false);

  const { clearSelection, setCurrentSide } = useWorkspaceMapSettings();
  const { setDataLoadProgress, setDatasetSnapshot, setDraftDataset, setError, setLoadingData } =
    useWorkspaceActions();

  const compatibleDataset = useCallback(
    (dataset: DatasetSettings) =>
      defaultLeague ? compatibleLeagueDataset(dataset, leagues, defaultLeague) : dataset,
    [defaultLeague, leagues],
  );

  const loadDataset = useCallback(
    async (dataset: DatasetSettings, forceRefresh: boolean) => {
      if (!defaultLeague) {
        setError("Unable to load leagues");

        return;
      }

      const run = ++dataRun.current;
      const compatible = compatibleDataset(dataset);

      dataRequest.current?.abort();

      const controller = new AbortController();
      dataRequest.current = controller;

      setLoadingData(true);
      setDataLoadProgress(null);
      setError(null);

      try {
        const result = await loadWardDataset(compatible, leagues, forceRefresh, {
          signal: controller.signal,
          maximumWards: maximumWardDatasetSize,
          onProgress: setDataLoadProgress,
        });

        if (run !== dataRun.current) {
          return;
        }

        restoredClusters.current = false;
        clustersMatchSettings.current = false;

        setCurrentSide(compatible.side);
        setDraftDataset(compatible);
        clearSelection();
        setDatasetSnapshot(compatible, result.wards, null, result.leagueFreshness);
      } catch (reason) {
        if (run === dataRun.current && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load ward data");
        }
      } finally {
        if (run === dataRun.current) {
          dataRequest.current = null;
          setDataLoadProgress(null);
          setLoadingData(false);
        }
      }
    },
    [
      clearSelection,
      compatibleDataset,
      defaultLeague,
      leagues,
      setCurrentSide,
      setDataLoadProgress,
      setDatasetSnapshot,
      setDraftDataset,
      setError,
      setLoadingData,
    ],
  );

  const cancelDatasetLoad = useCallback(() => {
    dataRequest.current?.abort();
  }, []);

  useEffect(
    () => () => {
      dataRequest.current?.abort();
    },
    [],
  );

  return {
    cancelDatasetLoad,
    clustersMatchSettings,
    compatibleDataset,
    loadDataset,
    restoredClusters,
  };
}
