import { useEffect, useRef, useState } from "react";
import { parseWardRecords } from "../api/validation";
import { isClusterSets, normalizeDataset } from "../dataset/model";
import type { DatasetSettings } from "../dataset/model";
import { clusterDataVersion, wardDataVersion } from "../dataset/storage";
import { getAnalysis, getSetting } from "../indexedDb";
import { autoViewSettingKey, normalizeSavedViewState } from "../savedViews/viewState";
import type { ViewState } from "../savedViews/viewState";
import { useWorkspaceActions } from "../state/workspaceSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
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
  const [pending, setPending] = useState<{
    dataset: DatasetSettings;
    view: ViewState | null;
  } | null>(null);
  const draftDataset = useWorkspaceStore((state) => state.draftDataset);
  const { applyWorkspaceSettings, restorePresentation } = useViewRestoration();
  const { setDataLoadProgress, setDatasetSnapshot, setDraftDataset, setLoadingData, setError } =
    useWorkspaceActions();

  // Restore browser data first. Only a subsequent competitive load needs leagues.
  useEffect(() => {
    if (!ready || autoViewReady.current) {
      return;
    }

    let active = true;
    const initialDraft = useWorkspaceStore.getState().draftDataset;

    setLoadingData(true);
    setDataLoadProgress(null);

    void Promise.all([getAnalysis("workspace:last"), getSetting(autoViewSettingKey)])
      .then(([session, storedAutoView]) => {
        if (!active) {
          return;
        }
        autoViewReady.current = true;
        const current = useWorkspaceStore.getState();

        // Do not overwrite an import or source change made while IndexedDB was opening.
        if (current.draftDataset !== initialDraft || current.loadedDataset) {
          setLoadingData(false);

          return;
        }

        const autoView = normalizeSavedViewState(storedAutoView);
        const cachedView = session ? normalizeSavedViewState(session.settings) : null;
        const view = autoView ?? cachedView;
        const restoredDataset = view?.workspace.dataset ?? initialDraft;
        const dataset = normalizeDataset({
          ...restoredDataset,
          source: initialDraft.source,
          importedMapVersion: initialDraft.importedMapVersion,
        });

        setDraftDataset(dataset);

        if (view) {
          applyWorkspaceSettings(view);
        }

        const canRestoreCache = Boolean(
          view &&
          session &&
          isClusterSets(session.clusterSets) &&
          cachedView &&
          JSON.stringify(cachedView.workspace) === JSON.stringify(view.workspace) &&
          view.workspace.wardDataVersion === wardDataVersion,
        );

        if (canRestoreCache && session && view) {
          try {
            const wards = parseWardRecords(session.wards);
            const clustersMatch = view.workspace.clusterDataVersion === clusterDataVersion;

            restoredClusters.current = clustersMatch;
            setDatasetSnapshot(
              dataset,
              wards,
              clustersMatch ? session.clusterSets! : null,
              session.leagueFreshness ?? null,
            );
            setLoadingData(false);
            restorePresentation(view);

            return;
          } catch {
            // Reload invalid cached data from its original source.
          }
        }

        setDatasetSnapshot(null, [], null);
        setLoadingData(false);
        setPending({ dataset, view });
      })
      .catch((reason: unknown) => {
        if (active) {
          autoViewReady.current = true;
          setLoadingData(false);
          setError(reason instanceof Error ? reason.message : "Unable to restore workspace");
        }
      });

    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!pending) {
      return;
    }
    if (draftDataset !== pending.dataset) {
      setPending(null);

      return;
    }
    if (pending.dataset.source === "competitive" && !defaultLeague) {
      return;
    }

    const dataset = compatibleDataset(pending.dataset);
    const view = pending.view;

    setPending(null);
    void loadDataset(dataset, false).then(() => {
      if (
        view &&
        JSON.stringify(useWorkspaceStore.getState().loadedDataset) === JSON.stringify(dataset)
      ) {
        restorePresentation(view);
      }
    });
  }, [pending, draftDataset, defaultLeague, compatibleDataset, loadDataset]);

  return autoViewReady;
}
