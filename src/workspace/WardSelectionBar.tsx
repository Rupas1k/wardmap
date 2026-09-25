import { useEffect, useMemo, useState } from "react";
import { BsChevronDown, BsLink45Deg, BsSlashCircle, BsX } from "react-icons/bs";
import { contextIds } from "../state/analysisContext";
import { locationKey, locationName, locationWards } from "../locations/locationIdentity";
import { formatGameTime } from "../metrics/wardMetrics";
import { useSelectedCluster } from "../state/mapSelectors";
import { useMapStore } from "../state/mapState";
import { selectDisplayedClusterSets } from "../state/workspaceSelectors";
import { useWorkspaceStore } from "../state/workspaceState";

export default function WardSelectionBar({
  onManualLocationChanged,
}: {
  onManualLocationChanged: (id: string | null) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const currentSide = useMapStore((state) => state.currentSide);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const setHoveredMapItem = useMapStore((state) => state.setHoveredMapItem);
  const clearHover = useMapStore((state) => state.clearHover);
  const selectedCluster = useSelectedCluster();
  const selectedWardIds = useWorkspaceStore((state) => state.selectedWardIds);
  const clearWardSelection = useWorkspaceStore((state) => state.clearWardSelectionSet);
  const excludeWards = useWorkspaceStore((state) => state.excludeWards);
  const setPendingLocationReselection = useWorkspaceStore(
    (state) => state.setPendingLocationReselection,
  );
  const wards = useWorkspaceStore((state) => state.wards);
  const displayedClusterSets = useWorkspaceStore(selectDisplayedClusterSets);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const mergeWardsIntoManualLocation = useWorkspaceStore(
    (state) => state.mergeWardsIntoManualLocation,
  );
  const removeWardsFromManualLocation = useWorkspaceStore(
    (state) => state.removeWardsFromManualLocation,
  );
  const selectedWards = useMemo(() => {
    const selected = new Set(selectedWardIds);

    return wards.filter((ward) => selected.has(ward.id));
  }, [selectedWardIds, wards]);
  const selectionGroups = useMemo(() => {
    const selectedById = new Map(selectedWards.map((ward) => [ward.id, ward]));
    const { playerId, matchId } = contextIds(context);
    const clusters = displayedClusterSets?.[currentSide] ?? [];
    const groups = clusters.flatMap((cluster, index) => {
      const locationMembers = locationWards(cluster, { side: currentSide, playerId, matchId });
      const groupWards = locationMembers.flatMap((ward) => {
        const selected = selectedById.get(ward.id);

        if (!selected) {
          return [];
        }

        selectedById.delete(ward.id);

        return [selected];
      });

      if (groupWards.length === 0) {
        return [];
      }

      return [
        {
          clusterId: cluster.cluster_id,
          key: locationKey(cluster, currentSide),
          label:
            locationName(cluster, currentSide, locationNames, manualLocations) ??
            `Location ${index + 1}`,
          totalWards: locationMembers.length,
          wards: groupWards,
        },
      ];
    });
    const unmatched = [...selectedById.values()];

    return unmatched.length > 0
      ? [
          ...groups,
          {
            clusterId: null,
            key: "other",
            label: "Other wards",
            totalWards: unmatched.length,
            wards: unmatched,
          },
        ]
      : groups;
  }, [context, currentSide, displayedClusterSets, locationNames, manualLocations, selectedWards]);
  const selectedManualLocation = selectedCluster?.manual_location_id
    ? (manualLocations.find((location) => location.id === selectedCluster.manual_location_id) ??
      null)
    : null;
  const selectedManualWardIds = new Set(selectedManualLocation?.wardIds ?? []);
  const mergeWards = [
    ...selectedWards,
    ...(selectedManualLocation?.wardIds ?? []).flatMap((id) => {
      const ward = wards.find((candidate) => candidate.id === id);

      return ward ? [ward] : [];
    }),
  ];
  const canMergeLocations =
    mergeWards.length >= 2 &&
    selectedWards.length > 0 &&
    mergeWards.every((ward) => ward.is_obs === mergeWards[0]?.is_obs);
  const canRemoveFromLocation = Boolean(
    selectedManualLocation &&
    selectedWardIds.length > 0 &&
    selectedWardIds.every((id) => selectedManualWardIds.has(id)),
  );

  useEffect(() => {
    if (selectedWardIds.length === 0) {
      setReviewing(false);
      setExpandedGroup(null);
    }
  }, [selectedWardIds.length]);

  useEffect(() => {
    if (selectedWardIds.length === 0) {
      return;
    }

    const clearOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearWardSelection();
      }
    };

    window.addEventListener("keydown", clearOnEscape);

    return () => window.removeEventListener("keydown", clearOnEscape);
  }, [clearWardSelection, selectedWardIds.length]);

  function changeManualLocation() {
    const changed =
      canRemoveFromLocation && selectedManualLocation
        ? removeWardsFromManualLocation(selectedManualLocation.id, selectedWardIds)
        : mergeWardsIntoManualLocation(selectedWardIds, selectedManualLocation?.id);

    if (!changed) {
      return;
    }

    clearExpandedClusters();

    const locationId = typeof changed === "string" ? changed : selectedManualLocation?.id;
    const stillExists = useWorkspaceStore
      .getState()
      .manualLocations.some((location) => location.id === locationId);

    if (!stillExists) {
      clearSelection();
    }

    onManualLocationChanged(stillExists ? (locationId ?? null) : null);
  }

  function excludeSelectedWards() {
    if (selectedWardIds.length === 0) {
      return;
    }

    if (selectedCluster) {
      const excluded = new Set(selectedWardIds);
      const wardIds = (selectedCluster.wards ?? [])
        .filter(
          (ward) =>
            !excluded.has(ward.id) &&
            (currentSide === "all" || ward.is_radiant === (currentSide === "radiant")),
        )
        .map((ward) => ward.id);

      setPendingLocationReselection({
        changedWardIds: selectedWardIds,
        kind: "exclude",
        sourceFingerprint: locationKey(selectedCluster, currentSide),
        wardIds,
      });
    }

    clearExpandedClusters();
    excludeWards(selectedWardIds);
  }

  if (selectedWardIds.length > 0) {
    const actionDisabled = !canRemoveFromLocation && !canMergeLocations;
    const actionTitle = canRemoveFromLocation
      ? "Remove selected wards from this location"
      : canMergeLocations
        ? "Merge selected wards into one location"
        : "Select at least two wards of the same type";

    return (
      <div className="-mx-4 mt-2 border-t border-cyan-300/15 bg-cyan-400/5 px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <button
            aria-expanded={reviewing}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-cyan-100 hover:text-white"
            type="button"
            onClick={() => setReviewing((current) => !current)}
          >
            <span className="truncate tabular-nums">
              {selectedWardIds.length.toLocaleString()}{" "}
              {selectedWardIds.length === 1 ? "ward" : "wards"} selected
            </span>
            <BsChevronDown
              className={`shrink-0 text-slate-500 transition-transform ${reviewing ? "rotate-180" : ""}`}
            />
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={actionTitle}
              className="rounded-sm p-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
              disabled={actionDisabled}
              title={actionTitle}
              type="button"
              onClick={changeManualLocation}
            >
              <BsLink45Deg />
            </button>
            <button
              aria-label="Exclude selected wards from grouping"
              className="rounded-sm p-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
              title="Exclude selected wards from grouping"
              type="button"
              onClick={excludeSelectedWards}
            >
              <BsSlashCircle />
            </button>
            <button
              aria-label="Clear ward selection"
              className="rounded-sm p-1.5 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-200"
              title="Clear ward selection"
              type="button"
              onClick={clearWardSelection}
            >
              <BsX />
            </button>
          </div>
        </div>
        {reviewing ? (
          <div className="mt-2 max-h-40 overflow-y-auto border-t border-cyan-300/10 pt-1">
            {selectionGroups.map((group) => {
              const expanded = expandedGroup === group.key;
              const wardIds = group.wards.map((ward) => ward.id);

              return (
                <div className="border-b border-white/6 last:border-0" key={group.key}>
                  <div
                    className="flex items-center gap-2 py-1.5"
                    onMouseEnter={() => setHoveredMapItem(group.clusterId, null)}
                    onMouseLeave={clearHover}
                  >
                    <button
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-slate-300 hover:text-white"
                      type="button"
                      onClick={() => setExpandedGroup(expanded ? null : group.key)}
                    >
                      <BsChevronDown
                        className={`shrink-0 text-[10px] text-slate-600 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{group.label}</span>
                      <span className="shrink-0 text-slate-500 tabular-nums">
                        {group.wards.length === group.totalWards
                          ? group.wards.length.toLocaleString()
                          : `${group.wards.length.toLocaleString()} of ${group.totalWards.toLocaleString()}`}
                      </span>
                    </button>
                    <button
                      aria-label={`Deselect selected wards from ${group.label}`}
                      className="shrink-0 rounded-sm p-1 text-sm text-slate-600 hover:bg-white/5 hover:text-slate-200"
                      title="Deselect these wards"
                      type="button"
                      onClick={() => useWorkspaceStore.getState().removeWardsFromSelection(wardIds)}
                    >
                      <BsX />
                    </button>
                  </div>
                  {expanded ? (
                    <div className="ml-3 border-l border-white/8 pl-3">
                      {group.wards.map((ward) => (
                        <div
                          className="flex items-center gap-2 py-1.5"
                          key={ward.id}
                          onMouseEnter={() => setHoveredMapItem(group.clusterId, ward.id)}
                          onMouseLeave={clearHover}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-slate-400">
                              {ward.player_name ?? "Unknown player"}
                            </span>
                            <span className="block truncate text-slate-600 tabular-nums">
                              Match {ward.match_id} at {formatGameTime(ward.time_placed, true)}
                            </span>
                          </span>
                          <button
                            aria-label={`Deselect ward by ${ward.player_name ?? "unknown player"}`}
                            className="shrink-0 rounded-sm p-1 text-sm text-slate-600 hover:bg-white/5 hover:text-slate-200"
                            type="button"
                            onClick={() =>
                              useWorkspaceStore.getState().removeWardsFromSelection([ward.id])
                            }
                          >
                            <BsX />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
