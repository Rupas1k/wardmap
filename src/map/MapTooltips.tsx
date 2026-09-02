import type { Cluster, ClusterWard, Side } from "../types";
import { elevatedSurfaceClass } from "../components/ui";

interface WardTooltipProps {
  ward: ClusterWard;
  x: number;
  y: number;
}

export function WardTooltip({ ward, x, y }: WardTooltipProps) {
  const minutes = Math.floor(Math.abs(ward.time_placed) / 60);
  const seconds = Math.abs(ward.time_placed) % 60;
  const placedAt = `${ward.time_placed < 0 ? "-" : ""}${minutes}:${String(seconds).padStart(2, "0")}`;
  const destroyingPlayer =
    ward.player_destroyed_name ??
    (ward.player_destroyed_id === null ? "Unknown player" : `Player ${ward.player_destroyed_id}`);

  return (
    <div
      className={`pointer-events-none absolute z-40 w-56 p-3 text-xs ${elevatedSurfaceClass}`}
      style={{ left: x, top: y }}
    >
      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="max-w-32 truncate font-semibold text-slate-100">
          {ward.player_name ?? "Unknown player"}
        </span>
        <span className={ward.is_destroyed ? "text-rose-300" : "text-emerald-300"}>
          {ward.is_destroyed ? "Dewarded" : "Full lifetime"}
        </span>
      </div>
      <p className="mb-2 truncate text-[11px] text-slate-400">
        {ward.team_name ?? "Unknown team"} vs {ward.opponent_team_name ?? "Unknown opponent"}
        {ward.team_won != null ? ` · ${ward.team_won ? "Won" : "Lost"}` : ""}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-slate-500">Match</dt>
        <dd className="text-right font-mono text-cyan-300">{ward.match_id}</dd>
        <dt className="text-slate-500">Placed</dt>
        <dd className="text-right font-mono text-slate-200">{placedAt}</dd>
        <dt className="text-slate-500">Lifetime</dt>
        <dd className="text-right font-mono text-slate-200">{ward.duration}s</dd>
        {ward.is_destroyed ? (
          <>
            <dt className="text-slate-500">Dewarded by</dt>
            <dd className="truncate text-right text-slate-200">{destroyingPlayer}</dd>
          </>
        ) : null}
      </dl>
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
  const data = cluster[side];
  const survivalRate = data?.amount ? Math.max(0, (1 - data.destroyed / data.amount) * 100) : null;

  return (
    <div
      className={`pointer-events-none absolute z-30 w-56 p-3 text-sm ${elevatedSurfaceClass}`}
      style={{ left: x, top: y }}
    >
      {data ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <dt className="text-slate-500">Wards</dt>
          <dd className="text-right font-mono font-semibold text-slate-200">
            {data.amount.toLocaleString()}
          </dd>
          <dt className="text-slate-500">Dewarded</dt>
          <dd className="text-right font-mono font-semibold text-rose-300">{data.destroyed}</dd>
          <dt className="text-slate-500">Not dewarded</dt>
          <dd className="text-right font-mono font-semibold text-emerald-300">
            {survivalRate?.toFixed(1)}%
          </dd>
        </dl>
      ) : (
        <p className="text-slate-500">No data for this side</p>
      )}
    </div>
  );
}
