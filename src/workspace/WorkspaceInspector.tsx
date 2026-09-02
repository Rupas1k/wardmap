import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { BsChevronLeft } from "react-icons/bs";
import { useMapStore } from "../state/mapState";
import { useSelectedCluster } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import DatasetOverview from "../dataset/DatasetOverview";
import LocationActivity from "../inspector/Graphs";
import WardList from "../inspector/WardList";
import LocationSummary from "../inspector/Records";
import { EmptyState, SwitchNav } from "../components/ui";
import LocationList from "../inspector/LocationList";
import { selectDisplayedClusterSets } from "../state/workspaceSelectors";
import { contextIds } from "../state/analysisContext";
import type { InspectorTab } from "../state/workspaceState";
import { inspectorTabs } from "../inspector/tabs";

export default function WorkspaceInspector() {
  const panel = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Record<InspectorTab, number>>({
    overview: 0,
    locations: 0,
    details: 0,
  });
  const currentSide = useMapStore((state) => state.currentSide);
  const focusRequest = useMapStore((state) => state.focusRequest);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const clearWardSelection = useMapStore((state) => state.clearWardSelection);
  const expandedClusterIds = useMapStore((state) => state.expandedClusterIds);
  const setClusterExpanded = useMapStore((state) => state.setClusterExpanded);
  const selectedWardId = useMapStore((state) => state.selectedWardId);
  const inspectorTab = useWorkspaceStore((state) => state.inspectorTab);
  const inspectorReturnTab = useWorkspaceStore((state) => state.inspectorReturnTab);
  const setInspectorTab = useWorkspaceStore((state) => state.setInspectorTab);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const setContextOrigin = useWorkspaceStore((state) => state.setContextOrigin);
  const setContextRefinement = useWorkspaceStore((state) => state.setContextRefinement);
  const setLocationView = useWorkspaceStore((state) => state.setLocationView);
  const wards = useWorkspaceStore((state) => state.wards);
  const clusterSets = useWorkspaceStore((state) => state.clusterSets);
  const displayClusterSets = useWorkspaceStore(selectDisplayedClusterSets);
  const clusteringEnabled = useWorkspaceStore((state) => state.clusteringEnabled);
  const showUnclustered = useWorkspaceStore((state) => state.showUnclustered);
  const selectedCluster = useSelectedCluster();
  const selectedSideData = selectedCluster?.[currentSide];
  const keepExpanded = selectedCluster
    ? expandedClusterIds.includes(selectedCluster.cluster_id)
    : false;
  const selectedWard = selectedCluster?.wards?.find(
    (ward) =>
      ward.id === selectedWardId &&
      (currentSide === "all" || ward.is_radiant === (currentSide === "radiant")),
  );
  const contextWards = useMemo(() => {
    const { playerId, matchId } = contextIds(context);

    return wards.filter(
      (ward) =>
        (currentSide === "all" || ward.is_radiant === (currentSide === "radiant")) &&
        (playerId === null || ward.player_placed_id === playerId) &&
        (matchId === null || ward.match_id === matchId),
    );
  }, [context, currentSide, wards]);
  const contextLabels = useMemo(() => {
    if (!context.origin) {
      return null;
    }

    const label = (kind: "player" | "match", id: number) => {
      if (kind === "match") {
        return `Match ${id}`;
      }

      return wards.find((ward) => ward.player_placed_id === id)?.player_name ?? `Player ${id}`;
    };

    const origin = label(context.origin.kind, context.origin.id);
    const refinement = context.refinement
      ? label(context.refinement.kind, context.refinement.id)
      : null;

    return { origin, refinement };
  }, [context.origin, context.refinement, wards]);
  const overviewTabLabel =
    (context.refinement ?? context.origin)?.kind === "player"
      ? "Player Overview"
      : (context.refinement ?? context.origin)?.kind === "match"
        ? "Match Overview"
        : "Overview";
  useEffect(() => {
    if (!selectedCluster && !focusRequest && inspectorTab === "details") {
      setInspectorTab(inspectorReturnTab);
    }
  }, [focusRequest, inspectorReturnTab, inspectorTab, selectedCluster, setInspectorTab]);

  useLayoutEffect(() => {
    panel.current?.scrollTo({ top: scrollPositions.current[inspectorTab] });
  }, [inspectorTab]);

  let detailsContent: ReactNode;

  if (!selectedCluster) {
    detailsContent = <EmptyState className="mt-2">Select a map point.</EmptyState>;
  } else {
    detailsContent = (
      <>
        {!selectedWard || (selectedSideData?.amount ?? 0) <= 1 ? (
          <button
            className="-ml-1 mb-2 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-xs text-slate-500 transition hover:bg-white/4 hover:text-slate-200"
            type="button"
            onClick={() => {
              clearSelection();
              setInspectorTab(inspectorReturnTab);
            }}
          >
            <BsChevronLeft className="text-[10px]" />
            {inspectorReturnTab === "overview" ? overviewTabLabel : "Context"}
          </button>
        ) : null}
        {(selectedSideData?.amount ?? 0) > 1 ? (
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              checked={keepExpanded}
              className="accent-cyan-400"
              type="checkbox"
              onChange={(event) =>
                setClusterExpanded(selectedCluster.cluster_id, event.target.checked)
              }
            />
            Keep expanded
          </label>
        ) : null}
        {!selectedWard && (selectedSideData?.amount ?? 0) > 1 ? (
          <>
            <LocationSummary flush />
            <LocationActivity />
          </>
        ) : null}
        <WardList />
      </>
    );
  }

  const contentByTab: Record<InspectorTab, ReactNode> = {
    overview: (
      <DatasetOverview
        contextLabel={
          contextLabels
            ? contextLabels.refinement
              ? `${contextLabels.origin} · ${contextLabels.refinement}`
              : contextLabels.origin
            : null
        }
        wards={contextWards}
        onChangeContext={() => {
          if (context.origin) {
            setLocationView(context.origin.kind === "player" ? "players" : "matches");
          }
          setInspectorTab("locations");
        }}
      />
    ),
    locations: (
      <LocationList
        baseClusters={clusterSets?.[currentSide] ?? []}
        clusters={displayClusterSets?.[currentSide] ?? []}
        clusteringEnabled={clusteringEnabled}
        showUnclustered={showUnclustered}
        side={currentSide}
      />
    ),
    details: detailsContent,
  };

  return (
    <aside
      className="overflow-y-auto border-l border-white/10 bg-slate-900"
      ref={panel}
      onScroll={(event) => {
        scrollPositions.current[inspectorTab] = event.currentTarget.scrollTop;
      }}
    >
      <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/95 px-4 pt-4 backdrop-blur">
        <p className="text-sm font-semibold text-slate-100">Inspector</p>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
          <span className="shrink-0">Showing:</span>
          {contextLabels ? (
            <>
              <button
                className={`min-w-0 truncate ${contextLabels.refinement ? "transition hover:text-slate-200" : "text-slate-300"}`}
                type="button"
                onClick={() => {
                  if (context.refinement) {
                    clearWardSelection();
                    clearExpandedClusters();
                    setContextRefinement(null);
                  }
                }}
              >
                {contextLabels.origin}
              </button>
              {contextLabels.refinement ? (
                <>
                  <span>/</span>
                  <span className="min-w-0 truncate text-slate-300">
                    {contextLabels.refinement}
                  </span>
                </>
              ) : null}
              <button
                aria-label="Clear current context level"
                className="ml-auto shrink-0 px-1 text-sm leading-none text-slate-600 transition hover:text-slate-200"
                type="button"
                onClick={() => {
                  if (context.refinement) {
                    clearWardSelection();
                    clearExpandedClusters();
                    setContextRefinement(null);
                  } else {
                    clearSelection();
                    clearExpandedClusters();
                    setContextOrigin(null);
                  }
                }}
              >
                ×
              </button>
              {context.status === "clustering" ? (
                <span className="shrink-0 text-slate-600">Clustering…</span>
              ) : null}
            </>
          ) : (
            <span className="truncate text-slate-300">All wards</span>
          )}
        </div>
        <SwitchNav
          className="mt-2"
          options={inspectorTabs.map(({ id, label, requiresSelection }) => ({
            value: id,
            label: id === "overview" ? overviewTabLabel : label,
            disabled: requiresSelection && !selectedCluster,
          }))}
          value={inspectorTab}
          onChange={setInspectorTab}
        />
      </div>
      <div className="px-4 py-3">{contentByTab[inspectorTab]}</div>
    </aside>
  );
}
