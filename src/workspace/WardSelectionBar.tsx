import { useMemo } from "react";
import { BsLink45Deg } from "react-icons/bs";
import { locationKey } from "../locations/locationIdentity";
import { useSelectedCluster } from "../state/mapSelectors";
import { useMapStore } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";

export default function WardSelectionBar({
  onManualLocationChanged,
}: {
  onManualLocationChanged: (id: string | null) => void;
}) {
  const currentSide = useMapStore((state) => state.currentSide);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const selectedCluster = useSelectedCluster();
  const selectedWardIds = useWorkspaceStore((state) => state.selectedWardIds);
  const clearWardSelection = useWorkspaceStore((state) => state.clearWardSelectionSet);
  const excludeWards = useWorkspaceStore((state) => state.excludeWards);
  const lastExcludedWardIds = useWorkspaceStore((state) => state.lastExcludedWardIds);
  const undoLastExclusion = useWorkspaceStore((state) => state.undoLastExclusion);
  const dismissExclusionUndo = useWorkspaceStore((state) => state.dismissExclusionUndo);
  const setPendingLocationReselection = useWorkspaceStore(
    (state) => state.setPendingLocationReselection,
  );
  const wards = useWorkspaceStore((state) => state.wards);
  const manualLocations = useWorkspaceStore((state) => state.manualLocations);
  const createManualLocation = useWorkspaceStore((state) => state.createManualLocation);
  const addWardsToManualLocation = useWorkspaceStore((state) => state.addWardsToManualLocation);
  const removeWardsFromManualLocation = useWorkspaceStore(
    (state) => state.removeWardsFromManualLocation,
  );
  const selectedWards = useMemo(() => {
    const selected = new Set(selectedWardIds);

    return wards.filter((ward) => selected.has(ward.id));
  }, [selectedWardIds, wards]);
  const assignedWardIds = useMemo(
    () => new Set(manualLocations.flatMap((location) => location.wardIds)),
    [manualLocations],
  );
  const selectedManualLocation = selectedCluster?.manual_location_id
    ? (manualLocations.find((location) => location.id === selectedCluster.manual_location_id) ??
      null)
    : null;
  const selectedManualWardIds = new Set(selectedManualLocation?.wardIds ?? []);
  const selectedManualWardType = selectedCluster?.wards?.[0]?.is_obs;
  const canCreateLocation =
    selectedWards.length >= 2 &&
    selectedWards.every((ward) => ward.is_obs === selectedWards[0]?.is_obs) &&
    selectedWards.every((ward) => !assignedWardIds.has(ward.id));
  const canAddToLocation = Boolean(
    selectedManualLocation &&
    selectedWards.length > 0 &&
    selectedManualWardType !== undefined &&
    selectedWards.every(
      (ward) => !assignedWardIds.has(ward.id) && ward.is_obs === selectedManualWardType,
    ),
  );
  const canRemoveFromLocation = Boolean(
    selectedManualLocation &&
    selectedWardIds.length > 0 &&
    selectedWardIds.every((id) => selectedManualWardIds.has(id)),
  );

  function changeManualLocation() {
    if (!selectedManualLocation) {
      const id = createManualLocation(selectedWardIds);

      if (id) {
        clearExpandedClusters();
        onManualLocationChanged(id);
      }

      return;
    }

    const changed = canRemoveFromLocation
      ? removeWardsFromManualLocation(selectedManualLocation.id, selectedWardIds)
      : addWardsToManualLocation(selectedManualLocation.id, selectedWardIds);

    if (!changed) {
      return;
    }

    clearExpandedClusters();

    const stillExists = useWorkspaceStore
      .getState()
      .manualLocations.some((location) => location.id === selectedManualLocation.id);

    if (!stillExists) {
      clearSelection();
    }

    onManualLocationChanged(stillExists ? selectedManualLocation.id : null);
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

  function undoExclusion() {
    if (lastExcludedWardIds.length === 0) {
      return;
    }

    const currentWardIds = selectedCluster?.wards?.map((ward) => ward.id) ?? [];

    setPendingLocationReselection({
      changedWardIds: lastExcludedWardIds,
      kind: "restore",
      sourceFingerprint: selectedCluster ? locationKey(selectedCluster, currentSide) : null,
      wardIds: [...new Set([...currentWardIds, ...lastExcludedWardIds])],
    });
    undoLastExclusion();
  }

  if (selectedWardIds.length > 0) {
    const actionDisabled = selectedManualLocation
      ? !canAddToLocation && !canRemoveFromLocation
      : !canCreateLocation;
    const actionLabel = canRemoveFromLocation
      ? "Remove from location"
      : canAddToLocation
        ? "Add to location"
        : "Group as location";
    const actionTitle = canRemoveFromLocation
      ? "Remove selected wards from this location"
      : canAddToLocation
        ? "Add selected wards to this location"
        : canCreateLocation
          ? "Group selected wards as one location"
          : selectedManualLocation
            ? "Select ungrouped wards of the same type, or members of this location"
            : "Select at least two ungrouped wards of the same type";

    return (
      <div className="-mx-4 mt-2 flex items-center gap-3 border-t border-cyan-300/15 bg-cyan-400/5 px-4 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate text-cyan-100 tabular-nums">
          {selectedWardIds.length.toLocaleString()} selected
        </span>
        <button
          className="inline-flex items-center gap-1 text-slate-300 enabled:hover:text-white disabled:cursor-not-allowed disabled:text-slate-600"
          disabled={actionDisabled}
          title={actionTitle}
          type="button"
          onClick={changeManualLocation}
        >
          <BsLink45Deg />
          {actionLabel}
        </button>
        <button
          className="text-slate-300 hover:text-white"
          type="button"
          onClick={excludeSelectedWards}
        >
          Exclude
        </button>
        <button
          className="text-slate-500 hover:text-slate-200"
          type="button"
          onClick={clearWardSelection}
        >
          Clear
        </button>
      </div>
    );
  }

  if (lastExcludedWardIds.length === 0) {
    return null;
  }

  return (
    <div className="-mx-4 mt-2 flex items-center gap-3 border-t border-white/8 bg-white/[0.02] px-4 py-2 text-xs">
      <span className="min-w-0 flex-1 truncate text-slate-400 tabular-nums">
        {lastExcludedWardIds.length.toLocaleString()}{" "}
        {lastExcludedWardIds.length === 1 ? "ward" : "wards"} excluded
      </span>
      <button className="text-cyan-400 hover:text-cyan-200" type="button" onClick={undoExclusion}>
        Undo
      </button>
      <button
        aria-label="Dismiss exclusion undo"
        className="px-1 text-sm leading-none text-slate-600 hover:text-slate-300"
        type="button"
        onClick={dismissExclusionUndo}
      >
        ×
      </button>
    </div>
  );
}
