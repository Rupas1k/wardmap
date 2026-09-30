import { useMemo } from "react";
import type { ReactNode } from "react";
import { formatGameTime, mean, meanAvailable, placingAdvantage } from "../metrics/wardMetrics";
import { useMapStore } from "../state/mapState";
import { useSelectedCluster } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import { InspectorSection, MetricRows } from "./InspectorPrimitives";
import { contextIds } from "../state/analysisContext";
import { measurementSummary } from "../metrics/analyzeDataset";

function signedDuration(value: number): string | null {
  if (Math.abs(value) < 0.5) {
    return null;
  }

  return `${value > 0 ? "+" : "−"}${formatGameTime(Math.abs(value))}`;
}

function signedDecimal(value: number): string | null {
  if (Math.abs(value) < 0.05) {
    return null;
  }

  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function withDatasetDelta(value: string, delta: string | null): ReactNode {
  return (
    <span>
      {value}
      {delta ? <span className="ml-1.5 text-xs text-slate-500">{delta} vs dataset</span> : null}
    </span>
  );
}

function signedGold(value: number): string {
  const rounded = Math.round(value);

  if (rounded === 0) {
    return "0";
  }

  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toLocaleString()}`;
}

export default function LocationSummary({ flush = false }: { flush?: boolean }) {
  const selectedCluster = useSelectedCluster();
  const average = useMapStore((state) => state.averageValues);
  const side = useMapStore((state) => state.currentSide);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const { playerId: selectedPlayerId, matchId: selectedMatchId } = contextIds(context);
  const wards = useWorkspaceStore((state) => state.wards);
  const measured = useMemo(() => {
    const ids = new Set((selectedCluster?.wards ?? []).map((ward) => ward.id));

    return measurementSummary(
      wards.filter(
        (ward) =>
          ids.has(ward.id) &&
          (side === "all" || ward.is_radiant === (side === "radiant")) &&
          (selectedPlayerId === null || ward.player_placed_id === selectedPlayerId) &&
          (selectedMatchId === null || ward.match_id === selectedMatchId),
      ),
    );
  }, [wards, selectedCluster, side, selectedPlayerId, selectedMatchId]);
  const benchmark = useMemo(
    () =>
      measurementSummary(
        wards.filter(
          (ward) => ward.is_obs && (side === "all" || ward.is_radiant === (side === "radiant")),
        ),
      ),
    [side, wards],
  );
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
      scouting_tracking_seconds: meanAvailable(
        selectedWards.map((ward) => ward.scouting_tracking_seconds),
      ),
      scouting_discovery_seconds: meanAvailable(
        selectedWards.map((ward) => ward.scouting_discovery_seconds),
      ),
      players: new Set(selectedWards.map((ward) => ward.player_placed_id)),
    };
  }, [locationData, selectedCluster, selectedMatchId, selectedPlayerId, side, wards]);

  const lifetime = sideData ? ((1 - sideData.destroyed / sideData.amount) * 100).toFixed(2) : null;
  const durationDelta = sideData && averageData ? sideData.duration - averageData.duration : null;
  const durationDeltaLabel = durationDelta === null ? null : signedDuration(durationDelta);
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
    ["Removed", sideData?.destroyed ?? "--"],
    ["Not removed rate", sideData && lifetime ? `${lifetime}%` : "--"],
    [
      "Average lifetime",
      <span key="average-lifetime">
        {sideData ? formatGameTime(sideData.duration, true) : "--"}
        {durationDeltaLabel ? (
          <span className="ml-1.5 text-xs text-slate-500">{durationDeltaLabel} vs dataset</span>
        ) : null}
      </span>,
    ],
    ["Average placement", sideData ? formatGameTime(sideData.time_placed, true) : "--"],
    [
      "Team gold at placement",
      sideData?.advantage == null ? (
        "--"
      ) : (
        <span
          className={
            sideData.advantage > 0
              ? "text-emerald-300"
              : sideData.advantage < 0
                ? "text-rose-300"
                : "text-slate-300"
          }
        >
          {signedGold(sideData.advantage)}
        </span>
      ),
    ],
  ];

  return (
    <>
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

      <InspectorSection separated title="Observer vision">
        <MetricRows
          rows={[
            [
              "Added vision, mean",
              withDatasetDelta(
                formatGameTime(measured.addedVision.mean),
                measured.addedVision.mean === null || benchmark.addedVision.mean === null
                  ? null
                  : signedDuration(measured.addedVision.mean - benchmark.addedVision.mean),
              ),
            ],
            ["Added vision, median", formatGameTime(measured.addedVision.median)],
            [
              "New enemy sightings, mean",
              withDatasetDelta(
                measured.freshSightings.mean?.toFixed(1) ?? "--",
                measured.freshSightings.mean === null || benchmark.freshSightings.mean === null
                  ? null
                  : signedDecimal(measured.freshSightings.mean - benchmark.freshSightings.mean),
              ),
            ],
            ["New enemy sightings, median", measured.freshSightings.median?.toFixed(1) ?? "--"],
            ...measured.dewardedWithin.map((item): [string, string] => [
              `Dewarded within ${item.seconds / 60} min`,
              item.rate === null ? "--" : `${(item.rate * 100).toFixed(1)}%`,
            ]),
          ]}
        />
      </InspectorSection>
    </>
  );
}
