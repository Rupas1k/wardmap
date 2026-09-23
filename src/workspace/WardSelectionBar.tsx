import { useEffect, useMemo, useState } from "react";
import { BsChevronDown, BsLink45Deg, BsThreeDots } from "react-icons/bs";
import { locationKey } from "../locations/locationIdentity";
import { formatGameTime } from "../metrics/wardMetrics";
import { useSelectedCluster } from "../state/mapSelectors";
import { useMapStore } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";

export default function WardSelectionBar({
  onManualLocationChanged,
}: {
  onManualLocationChanged: (id: string | null) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const currentSide = useMapStore((state) => state.currentSide);
  const clearSelection = useMapStore((state) => state.clearSelection);
  const clearExpandedClusters = useMapStore((state) => state.clearExpandedClusters);
  const selectedCluster = useSelectedCluster();
  const selectedWardIds = useWorkspaceStore((state) => state.selectedWardIds);
  const clearWardSelection = useWorkspaceStore((state) => state.clearWardSelectionSet);
  const excludeWards = useWorkspaceStore((state) => state.excludeWards);
  const excludedWardIds = useWorkspaceStore((state) => state.excludedWardIds);
  const locationChangeUndo = useWorkspaceStore((state) => state.locationChangeUndo);
  const undoLocationChange = useWorkspaceStore((state) => state.undoLocationChange);
  const dismissLocationChange = useWorkspaceStore((state) => state.dismissLocationChange);
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

  useEffect(() => {
    if (selectedWardIds.length === 0) {
      setReviewing(false);
    }
  }, [selectedWardIds.length]);

  useEffect(() => {
    if (!locationChangeUndo) {
      return;
    }

    const timeout = window.setTimeout(dismissLocationChange, 6000);

    return () => window.clearTimeout(timeout);
  }, [dismissLocationChange, locationChangeUndo]);

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

  function undoChange() {
    if (!locationChangeUndo) {
      return;
    }

    const previous = new Set(locationChangeUndo.excludedWardIds);
    const current = new Set(excludedWardIds);
    const changedWardIds = [...new Set([...previous, ...current])].filter(
      (id) => previous.has(id) !== current.has(id),
    );
    const currentWardIds = selectedCluster?.wards?.map((ward) => ward.id) ?? [];
    const restoresWards = changedWardIds.some((id) => current.has(id) && !previous.has(id));

    if (changedWardIds.length > 0) {
      setPendingLocationReselection({
        changedWardIds,
        kind: restoresWards ? "restore" : "exclude",
        sourceFingerprint: selectedCluster ? locationKey(selectedCluster, currentSide) : null,
        wardIds: restoresWards
          ? [...new Set([...currentWardIds, ...changedWardIds])]
          : currentWardIds.filter((id) => !changedWardIds.includes(id)),
      });
    }

    undoLocationChange();
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
          {!actionDisabled ? (
            <button
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
              title={actionTitle}
              type="button"
              onClick={changeManualLocation}
            >
              <BsLink45Deg />
              {actionLabel}
            </button>
          ) : null}
          <details className="group relative">
            <summary
              aria-label="More selection actions"
              className="cursor-pointer list-none rounded-sm p-1 text-slate-500 hover:bg-white/5 hover:text-white"
              title="More actions"
            >
              <BsThreeDots />
            </summary>
            <div className="absolute top-full right-0 z-30 mt-1 w-44 border border-white/10 bg-slate-950 p-1 shadow-xl">
              <button
                className="block w-full rounded-sm px-2 py-1.5 text-left text-slate-300 hover:bg-white/5 hover:text-white"
                type="button"
                onClick={excludeSelectedWards}
              >
                Exclude from grouping
              </button>
              <button
                className="block w-full rounded-sm px-2 py-1.5 text-left text-slate-500 hover:bg-white/5 hover:text-slate-200"
                type="button"
                onClick={clearWardSelection}
              >
                Clear selection
              </button>
            </div>
          </details>
        </div>
        {reviewing ? (
          <div className="mt-2 max-h-40 overflow-y-auto border-t border-cyan-300/10 pt-1">
            {selectedWards.map((ward) => (
              <div className="flex items-center gap-2 py-1.5" key={ward.id}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-300">
                    {ward.player_name ?? "Unknown player"}
                  </span>
                  <span className="block truncate text-slate-500 tabular-nums">
                    Match {ward.match_id} at {formatGameTime(ward.time_placed, true)}
                  </span>
                </span>
                <button
                  aria-label={`Deselect ward by ${ward.player_name ?? "unknown player"}`}
                  className="shrink-0 px-1 text-sm text-slate-600 hover:text-slate-200"
                  type="button"
                  onClick={() => useWorkspaceStore.getState().toggleWardSelection(ward.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!locationChangeUndo) {
    return null;
  }

  return (
    <div className="-mx-4 mt-2 flex items-center gap-3 border-t border-white/8 bg-white/[0.02] px-4 py-2 text-xs">
      <span className="min-w-0 flex-1 truncate text-slate-400">{locationChangeUndo.message}</span>
      <button className="text-cyan-400 hover:text-cyan-200" type="button" onClick={undoChange}>
        Undo
      </button>
      <button
        aria-label="Dismiss undo"
        className="px-1 text-sm leading-none text-slate-600 hover:text-slate-300"
        type="button"
        onClick={dismissLocationChange}
      >
        ×
      </button>
    </div>
  );
}
