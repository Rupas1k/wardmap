import type { Cluster, ClusterWard, Side } from "../types";
import { elevatedSurfaceClass } from "../components/ui";
import { wardOutcomeTextClass } from "../colors";
import { formatGameTime, formatWardOutcome } from "../metrics/wardMetrics";
import { locationFingerprint } from "../locations/locationIdentity";
import { useWorkspaceStore } from "../state/workspaceState";

interface WardTooltipProps {
  ward: ClusterWard;
  x: number;
  y: number;
}

export function WardTooltip({ ward, x, y }: WardTooltipProps) {
  const destroyingPlayer =
    ward.player_destroyed_name ??
    (ward.player_destroyed_id === null ? "Unknown player" : `Player ${ward.player_destroyed_id}`);
  const outcome = ward.measurement
    ? formatWardOutcome(ward.measurement.outcome)
    : ward.is_destroyed
      ? "Dewarded"
      : "Not dewarded";
  const team = ward.team_name ?? (ward.is_radiant ? "Radiant" : "Dire");
  const opponent = ward.opponent_team_name;
  const result = ward.team_won === null ? null : ward.team_won ? "won" : "lost";
  const freshSightings = ward.measurement?.fresh_sightings;
  const matchSummary = opponent
    ? `${team}${result ? ` ${result}` : ""} vs ${opponent}`
    : result
      ? `${team} ${result}`
      : team;

  return (
    <div
      className={`pointer-events-none absolute z-40 w-64 p-3 text-xs ${elevatedSurfaceClass}`}
      style={{ left: x, top: y }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-slate-100">
          {ward.player_name ?? "Unknown player"}
        </span>
        <span
          className={`shrink-0 ${wardOutcomeTextClass(
            ward.measurement?.outcome ?? null,
            ward.is_destroyed,
          )}`}
        >
          {outcome}
        </span>
      </div>
      <p className="mt-0.5 truncate text-slate-400">{matchSummary}</p>
      <p className="mt-0.5 text-slate-500">
        {ward.is_radiant ? "Radiant" : "Dire"} {ward.is_obs ? "observer" : "sentry"}
      </p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-white/10 pt-3">
        <dt className="text-slate-500">Placed</dt>
        <dd className="text-right text-slate-200 tabular-nums">
          {formatGameTime(ward.time_placed)}
        </dd>
        <dt className="text-slate-500">Lifetime</dt>
        <dd className="text-right text-slate-200 tabular-nums">{formatGameTime(ward.duration)}</dd>
        {ward.measurement?.added_vision_seconds !== null &&
        ward.measurement?.added_vision_seconds !== undefined ? (
          <>
            <dt className="text-slate-500">Added vision</dt>
            <dd className="text-right text-slate-200 tabular-nums">
              {formatGameTime(ward.measurement.added_vision_seconds)}
            </dd>
          </>
        ) : null}
        {freshSightings !== null && freshSightings !== undefined ? (
          <>
            <dt className="text-slate-500">New enemy sightings</dt>
            <dd className="text-right text-slate-200 tabular-nums">
              {Number.isInteger(freshSightings)
                ? freshSightings.toLocaleString()
                : freshSightings.toFixed(1)}
            </dd>
          </>
        ) : null}
        {ward.measurement?.outcome === "dewarded" || (!ward.measurement && ward.is_destroyed) ? (
          <>
            <dt className="text-slate-500">Dewarded by</dt>
            <dd className="truncate text-right text-slate-200">{destroyingPlayer}</dd>
          </>
        ) : null}
      </dl>

      <p className="mt-3 border-t border-white/10 pt-2 text-slate-500">Click for ward details</p>
    </div>
  );
}

interface ClusterTooltipProps {
  cluster: Cluster;
  side: Side;
  x: number;
  y: number;
}

export function ClusterTooltip({ cluster, side, x, y }: ClusterTooltipProps) {
  const locationNames = useWorkspaceStore((state) => state.locationNames);
  const data = cluster[side];
  const name = locationNames[locationFingerprint(cluster, side)];
  const survivalRate = data?.amount ? Math.max(0, (1 - data.destroyed / data.amount) * 100) : null;

  return (
    <div
      className={`pointer-events-none absolute z-30 w-56 p-3 text-sm ${elevatedSurfaceClass}`}
      style={{ left: x, top: y }}
    >
      {data ? (
        <>
          {name ? <p className="mb-2 truncate font-medium text-slate-100">{name}</p> : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <dt className="text-slate-500">Wards</dt>
            <dd className="text-right text-slate-200 tabular-nums">
              {data.amount.toLocaleString()}
            </dd>
            <dt className="text-slate-500">Removed</dt>
            <dd className="text-right text-slate-200 tabular-nums">{data.destroyed}</dd>
            <dt className="text-slate-500">Not removed</dt>
            <dd className="text-right text-slate-200 tabular-nums">{survivalRate?.toFixed(1)}%</dd>
          </dl>
        </>
      ) : (
        <p className="text-slate-500">No data for this side</p>
      )}
    </div>
  );
}
