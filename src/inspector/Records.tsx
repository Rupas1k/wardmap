import { useMemo } from "react";
import type { ReactNode } from "react";
import { formatGameTime, mean, placingAdvantage } from "../metrics/wardMetrics";
import { useMapStore } from "../state/mapState";
import { useSelectedCluster } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import { InspectorSection, MetricRows } from "./InspectorPrimitives";
import { survivalColor } from "../colors";
import { contextIds } from "../state/analysisContext";

export default function LocationSummary({ flush = false }: { flush?: boolean }) {
  const selectedCluster = useSelectedCluster();
  const average = useMapStore((state) => state.averageValues);
  const side = useMapStore((state) => state.currentSide);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const { playerId: selectedPlayerId, matchId: selectedMatchId } = contextIds(context);
  const wards = useWorkspaceStore((state) => state.wards);
  const locationData = selectedCluster?.[side] ?? null;
  const averageData = average?.[side] ?? null;
  const sideData = useMemo(() => {
    if (!locationData || (selectedPlayerId === null && selectedMatchId === null)) {
      return locationData;
    }

    const selectedWards = (selectedCluster?.wards ?? []).filter(
      (ward) =>
        (side === "all" || ward.is_radiant === (side === "radiant")) &&
        (selectedPlayerId === null || ward.player_placed_id === selectedPlayerId) &&
        (selectedMatchId === null || ward.match_id === selectedMatchId),
    );

    if (!selectedWards.length) {
      return null;
    }

    const rawWards = new Map(wards.map((ward) => [ward.id, ward]));
    const advantages = selectedWards.flatMap((ward) => {
      const rawWard = rawWards.get(ward.id);
      const advantage = rawWard ? placingAdvantage(rawWard) : null;

      return advantage === null ? [] : [advantage];
    });

    return {
      amount: selectedWards.length,
      match_count: new Set(selectedWards.map((ward) => ward.match_id)).size,
      destroyed: selectedWards.filter((ward) => ward.is_destroyed).length,
      advantage: mean(advantages),
      duration: mean(selectedWards.map((ward) => ward.duration)) ?? 0,
      time_placed: mean(selectedWards.map((ward) => ward.time_placed)) ?? 0,
      players: new Set(selectedWards.map((ward) => ward.player_placed_id)),
    };
  }, [locationData, selectedCluster, selectedMatchId, selectedPlayerId, side, wards]);

  const lifetime = sideData ? ((1 - sideData.destroyed / sideData.amount) * 100).toFixed(2) : null;
  const durationDelta = sideData && averageData ? sideData.duration - averageData.duration : null;

  const records: [string, ReactNode][] = [
    ["Wards", sideData?.amount ?? "--"],
    ["Matches", sideData?.match_count ?? "--"],
    [
      "Players",
      sideData
        ? sideData.players instanceof Set
          ? sideData.players.size
          : sideData.players.length
        : "--",
    ],
    ["Dewarded", sideData?.destroyed ?? "--"],
    [
      "Not dewarded rate",
      sideData && lifetime ? (
        <span style={{ color: survivalColor(sideData.destroyed, sideData.amount) }}>
          {lifetime}%
        </span>
      ) : (
        "--"
      ),
    ],
    [
      "Average lifetime",
      <span key="average-lifetime">
        {sideData ? formatGameTime(sideData.duration, true) : "--"}
        {durationDelta === null ? null : (
          <span className="ml-1.5 text-xs" style={{ color: durationDelta >= 0 ? "green" : "red" }}>
            {durationDelta >= 0 ? "+" : "-"}
            {formatGameTime(Math.abs(durationDelta), true)}
          </span>
        )}
      </span>,
    ],
    ["Average placement", sideData ? formatGameTime(sideData.time_placed, true) : "--"],
    [
      "Gold advantage at placement",
      sideData?.advantage == null ? (
        "--"
      ) : (
        <span className={sideData.advantage >= 0 ? "text-green-500" : "text-red-500"}>
          {Math.round(sideData.advantage).toLocaleString()}
        </span>
      ),
    ],
  ];

  return (
    <InspectorSection
      flush={flush}
      title={
        selectedPlayerId !== null
          ? "Player summary"
          : selectedMatchId !== null
            ? "Match summary"
            : "Summary"
      }
    >
      <MetricRows rows={records} />
    </InspectorSection>
  );
}
