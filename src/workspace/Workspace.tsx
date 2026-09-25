import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BsGithub, BsLayoutSidebarInsetReverse, BsSliders } from "react-icons/bs";
import AccessKey from "../components/AccessKey";
import DatasetControls from "../dataset/DatasetControls";
import MapSettings from "../map/MapSettings";
import { DownloadMapButton, SavedViewsMenu } from "../map/MapActions";
import MapView from "../map/MapView";
import type { MapViewHandle } from "../map/MapView";
import { FloatingIconButton, SwitchNav } from "../components/ui";
import { defaultDataset } from "../dataset/model";
import useWorkspaceController from "./useWorkspaceController";
import SavedViewControls from "../savedViews/SavedViewControls";
import SharedViewLoader from "../savedViews/SharedViewLoader";
import GroupingControls from "../clustering/GroupingControls";
import { buildEmptyClusterSets } from "../clustering/buildClusters";
import { defaultClusteringSettings, useMapStore } from "../state/mapState";
import { sharedViewUrl } from "../savedViews/sharedView";
import type { StoredAnalysis } from "../indexedDb";
import { useWorkspaceStore } from "../state/workspaceState";
import { fallbackMapVersion } from "../map/constants";
import type { ViewState } from "../savedViews/viewState";

const WorkspaceInspector = lazy(() => import("./WorkspaceInspector"));
const emptyClusterSets = buildEmptyClusterSets();

type ControlTab = "filters" | "grouping";

function changedSettingCount<T extends object>(current: T, defaults: T) {
  return Object.keys(defaults).filter((key) => {
    const setting = key as keyof T;

    return JSON.stringify(current[setting]) !== JSON.stringify(defaults[setting]);
  }).length;
}

export default function Workspace({
  leagueError,
  retryLeagues,
}: {
  leagueError: string | null;
  retryLeagues: () => void;
}) {
  const mapView = useRef<MapViewHandle>(null);
  const [controlTab, setControlTab] = useState<ControlTab>("filters");
  const currentSide = useMapStore((state) => state.currentSide);
  const setWorkspaceError = useWorkspaceStore((state) => state.setError);
  const {
    data: {
      leagues,
      draftDataset,
      loadedDataset,
      wards,
      clusterSets,
      displayClusterSets,
      savedViews,
      teams,
      players,
      opponentPlayers,
      defaultLeague,
    },
    panels: { controlsOpen, inspectorOpen },
    analysis: {
      clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      showUnclustered,
      visionTechnique,
      clusterMarkerSize,
    },
    status: {
      ready,
      loadingData,
      dataLoadProgress,
      clustering,
      error,
      datasetFreshness,
      activeView,
      deletedView,
      viewModified,
    },
    actions: {
      setDraftDataset,
      setControlsOpen,
      setInspectorOpen,
      updateClusteringEnabled,
      updateGridCellGrouping,
      updateUnclusteredVisibility,
      updateVisionTechnique,
      updateClusterMarkerSize,
      updateClustering,
      replaceClustering,
      saveView,
      applySharedView,
      restoreView,
      revertView,
      renameView,
      removeView,
      resetCurrentView,
      updateView,
      undoRemoveView,
      loadDataset,
      cancelDatasetLoad,
    },
  } = useWorkspaceController();

  const datasetChanged = JSON.stringify(draftDataset) !== JSON.stringify(loadedDataset);
  const resetDataset = {
    ...defaultDataset,
    leagueIds: defaultLeague ? [defaultLeague.id] : [],
  };
  const filtersAtDefault = JSON.stringify(draftDataset) === JSON.stringify(resetDataset);
  const filterCount = changedSettingCount(draftDataset, resetDataset);
  const groupingAtDefault =
    JSON.stringify(clusteringSettings) === JSON.stringify(defaultClusteringSettings) &&
    clusteringEnabled &&
    !groupByGridCell &&
    !showUnclustered;
  const visionRanges: [number | null, number | null][] = [
    [draftDataset.minimumScoutingTracking, draftDataset.maximumScoutingTracking],
    [draftDataset.minimumScoutingDiscovery, draftDataset.maximumScoutingDiscovery],
  ];
  const visionRangesValid = visionRanges.every(
    ([minimum, maximum]) => minimum === null || maximum === null || minimum <= maximum,
  );
  const datasetValid =
    draftDataset.leagueIds.length > 0 &&
    draftDataset.minimumGameMinute <= draftDataset.maximumGameMinute &&
    draftDataset.minimumMatchDuration <= draftDataset.maximumMatchDuration &&
    draftDataset.minimumWardLifetime <= draftDataset.maximumWardLifetime &&
    visionRangesValid;

  const mapLeague =
    leagues
      .filter((candidate) => (loadedDataset ?? draftDataset).leagueIds.includes(candidate.id))
      .sort((left, right) => right.version - left.version)[0] ?? defaultLeague;
  const mapVersion = mapLeague?.version ?? fallbackMapVersion;
  const displayedError = leagueError ?? error;

  async function shareView(savedView: StoredAnalysis<ViewState>) {
    const url = sharedViewUrl(savedView.settings);

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy this link", url);
      }
    } catch {
      window.prompt("Unable to access the clipboard. Copy this link manually:", url);
      setWorkspaceError("The share link could not be copied automatically");
    }
  }

  useEffect(() => {
    const undoLocationChange = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "z" ||
        (!event.ctrlKey && !event.metaKey) ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      const workspace = useWorkspaceStore.getState();

      if (!workspace.locationChangeUndo) {
        return;
      }

      event.preventDefault();
      workspace.undoLocationChange();
    };

    window.addEventListener("keydown", undoLocationChange);

    return () => window.removeEventListener("keydown", undoLocationChange);
  }, []);

  const layoutClass =
    controlsOpen && inspectorOpen
      ? "xl:grid-cols-[17rem_minmax(0,1fr)_26rem]"
      : controlsOpen
        ? "xl:grid-cols-[17rem_minmax(0,1fr)]"
        : inspectorOpen
          ? "xl:grid-cols-[minmax(0,1fr)_26rem]"
          : "xl:grid-cols-1";

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 xl:h-screen xl:min-h-0">
      {defaultLeague ? <SharedViewLoader apply={applySharedView} /> : null}
      <div className={`grid min-h-0 flex-1 grid-cols-1 ${layoutClass}`}>
        <aside
          className={`${controlsOpen ? "flex" : "hidden"} min-h-0 flex-col border-r border-white/10 bg-slate-900`}
        >
          <div className="flex items-center justify-between px-3 pt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-100">Wardmap</p>
              <a
                aria-label="Open Wardmap on GitHub"
                className="p-1 text-slate-600 hover:text-slate-300"
                href="https://github.com/Rupas1k/wardmap"
                rel="noreferrer"
                target="_blank"
                title="GitHub"
              >
                <BsGithub />
              </a>
            </div>
            <AccessKey />
          </div>
          <SwitchNav
            className="mt-2 px-3 capitalize"
            options={
              [
                {
                  value: "filters",
                  label: (
                    <>
                      Filters
                      {filterCount > 0 ? (
                        <span className="ml-1.5 text-[11px] text-cyan-400 tabular-nums">
                          {filterCount}
                        </span>
                      ) : null}
                    </>
                  ),
                },
                { value: "grouping", label: "Grouping" },
              ] as const
            }
            value={controlTab}
            onChange={setControlTab}
          />
          <div className="min-h-0 flex-1">
            <div
              className={`${controlTab === "filters" ? "block" : "hidden"} h-full overflow-y-auto p-3`}
            >
              <DatasetControls
                leagues={leagues}
                players={players}
                opponentPlayers={opponentPlayers}
                teams={teams}
                settings={draftDataset}
                setSettings={setDraftDataset}
              />
            </div>

            <div
              className={`${controlTab === "grouping" ? "block" : "hidden"} h-full overflow-y-auto p-3`}
            >
              <GroupingControls
                clusterSets={displayClusterSets}
                clustering={clustering}
                clusteringEnabled={clusteringEnabled}
                currentSide={currentSide}
                groupByGridCell={groupByGridCell}
                settings={clusteringSettings}
                showUnclustered={showUnclustered}
                update={updateClustering}
                updateClusteringEnabled={updateClusteringEnabled}
                updateGridCellGrouping={updateGridCellGrouping}
                updateUnclusteredVisibility={updateUnclusteredVisibility}
              />
            </div>
          </div>
          <div className="border-t border-white/10 bg-slate-900 p-3">
            {displayedError ? (
              <div className="mb-2 flex items-start justify-between gap-2 text-xs leading-4 text-rose-300">
                <p>{displayedError}</p>
                {leagueError ? (
                  <button
                    className="shrink-0 text-slate-400 hover:text-slate-200"
                    type="button"
                    onClick={retryLeagues}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : !ready ? (
              <p className="mb-2 text-xs text-slate-500">Restoring workspace…</p>
            ) : null}

            {datasetChanged || datasetFreshness.stale ? (
              <p className="mb-2 text-xs text-amber-300">
                {datasetChanged
                  ? "Map still shows the previous dataset"
                  : `${datasetFreshness.availableMatches.toLocaleString()} parsed matches available`}
              </p>
            ) : null}

            {loadingData ? (
              <p className="mb-2 text-xs text-cyan-300">
                {dataLoadProgress
                  ? `Loaded ${dataLoadProgress.loaded.toLocaleString()} of ${dataLoadProgress.total.toLocaleString()} wards`
                  : "Checking dataset size…"}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                className="rounded-sm border border-white/10 px-3 py-2 text-xs text-slate-400 hover:border-white/20 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
                disabled={controlTab === "filters" ? filtersAtDefault : groupingAtDefault}
                type="button"
                onClick={() => {
                  if (controlTab === "filters") {
                    setDraftDataset(resetDataset);

                    return;
                  }

                  replaceClustering(defaultClusteringSettings);
                  updateClusteringEnabled(true);
                  updateGridCellGrouping(false);
                  updateUnclusteredVisibility(false);
                }}
              >
                Reset
              </button>
              <button
                className="min-w-0 flex-1 rounded-sm bg-slate-200 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white disabled:bg-slate-700 disabled:text-slate-400"
                disabled={!loadingData && (!datasetValid || (!datasetChanged && !loadedDataset))}
                type="button"
                onClick={() => {
                  if (loadingData) {
                    cancelDatasetLoad();

                    return;
                  }

                  void loadDataset(
                    datasetChanged ? draftDataset : (loadedDataset ?? draftDataset),
                    !datasetChanged,
                  );
                }}
              >
                {loadingData
                  ? "Cancel load"
                  : !datasetValid
                    ? "Check filter ranges"
                    : datasetChanged
                      ? "Apply filters"
                      : datasetFreshness.stale
                        ? "Update dataset"
                        : "Refresh dataset"}
              </button>
            </div>
          </div>
        </aside>

        <section className="relative min-h-[60vh] overflow-hidden bg-slate-950 xl:min-h-0">
          <div className="absolute top-12 left-3 z-20 flex flex-col items-start gap-1">
            <SavedViewsMenu>
              <SavedViewControls
                activeView={activeView}
                deletedView={deletedView}
                disabled={!clusterSets}
                modified={viewModified}
                remove={removeView}
                rename={renameView}
                resetCurrentView={resetCurrentView}
                restore={restoreView}
                revert={revertView}
                save={saveView}
                share={shareView}
                update={updateView}
                undoRemove={undoRemoveView}
                views={savedViews}
              />
            </SavedViewsMenu>
            <MapSettings
              clusterMarkerSize={clusterMarkerSize}
              mapVersion={mapVersion}
              visionTechnique={visionTechnique}
              setVisionTechnique={updateVisionTechnique}
              setClusterMarkerSize={updateClusterMarkerSize}
            />
            <DownloadMapButton
              download={async () => {
                await mapView.current?.downloadImage();
              }}
            />
          </div>
          <FloatingIconButton
            aria-label={controlsOpen ? "Hide filters" : "Show filters"}
            className={`absolute top-3 left-3 z-30 ${controlsOpen ? "bg-slate-800 text-slate-100" : ""}`}
            title={controlsOpen ? "Hide filters" : "Show filters"}
            onClick={() => setControlsOpen(!controlsOpen)}
          >
            <BsSliders />
          </FloatingIconButton>
          {displayedError && !controlsOpen ? (
            <div className="absolute bottom-3 left-3 z-30 flex max-w-md items-start gap-3 bg-slate-950/90 px-3 py-2 text-xs text-rose-300">
              <p>{displayedError}</p>
              {leagueError ? (
                <button
                  className="shrink-0 text-slate-400 hover:text-slate-200"
                  type="button"
                  onClick={retryLeagues}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          <MapView
            clusterSets={displayClusterSets ?? emptyClusterSets}
            mapVersion={mapVersion}
            ref={mapView}
            showUnclustered={showUnclustered}
          />
          {displayClusterSets && wards.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-slate-950/35">
              <p className="bg-slate-950/90 px-4 py-3 text-sm text-slate-300">
                No wards match the current filters.
              </p>
            </div>
          ) : null}
          <FloatingIconButton
            aria-label="Toggle inspector"
            className={`absolute top-3 right-3 z-30 ${inspectorOpen ? "bg-slate-800 text-slate-100" : ""}`}
            title={inspectorOpen ? "Hide inspector" : "Show inspector"}
            onClick={() => setInspectorOpen(!inspectorOpen)}
          >
            <BsLayoutSidebarInsetReverse />
          </FloatingIconButton>
        </section>

        {inspectorOpen ? (
          <Suspense
            fallback={
              <aside className="grid place-items-center border-l border-white/10 bg-slate-900 text-xs text-slate-500">
                Loading inspector…
              </aside>
            }
          >
            <WorkspaceInspector />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
