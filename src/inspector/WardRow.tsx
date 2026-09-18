import { formatGameTime, formatWardOutcome } from "../metrics/wardMetrics";
import { useMapStore } from "../state/mapState";
import type { ClusterWard, Ward } from "../types";
import { selectableRowClass } from "../components/ui";
import { wardOutcomeDotClass, wardOutcomeTextClass } from "../colors";

type WardRowData = Pick<
  Ward,
  | "id"
  | "match_id"
  | "player_name"
  | "player_destroyed_id"
  | "player_destroyed_name"
  | "is_obs"
  | "is_destroyed"
  | "measurement"
  | "time_placed"
  | "duration"
  | "x_pos"
  | "y_pos"
>;

export function destroyingPlayerName(ward: WardRowData): string {
  return (
    ward.player_destroyed_name ??
    (ward.player_destroyed_id === null ? "Unknown player" : `Player ${ward.player_destroyed_id}`)
  );
}

export default function WardRow({
  label,
  onSelect,
  onSelected,
  ward,
}: {
  label?: string;
  onSelect?: () => void;
  onSelected?: () => void;
  ward: WardRowData | ClusterWard;
}) {
  const selectedWardId = useMapStore((state) => state.selectedWardId);
  const setSelectedWardId = useMapStore((state) => state.setSelectedWardId);
  const centerMapAt = useMapStore((state) => state.centerMapAt);
  const selected = ward.id === selectedWardId;
  const destroyingPlayer = destroyingPlayerName(ward);
  const outcome = ward.measurement
    ? formatWardOutcome(ward.measurement.outcome)
    : ward.is_destroyed
      ? "Dewarded"
      : "Not dewarded";

  return (
    <div
      className={`grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 py-2 ${selectableRowClass(selected)}`}
      data-ward-id={ward.id}
    >
      <i
        className={`mx-auto size-2 rounded-full ${
          !ward.is_obs
            ? "bg-sky-400"
            : wardOutcomeDotClass(ward.measurement?.outcome ?? null, ward.is_destroyed)
        }`}
      />
      <button
        aria-pressed={selected}
        className="min-w-0 text-left"
        type="button"
        onClick={() => {
          if (selected) {
            if (onSelected) {
              onSelected();
            } else {
              centerMapAt(ward.x_pos, ward.y_pos);
            }

            return;
          }

          if (onSelect) {
            onSelect();
          } else {
            setSelectedWardId(ward.id);
            centerMapAt(ward.x_pos, ward.y_pos);
          }
        }}
      >
        {label ? <span className="block truncate text-[10px] text-slate-500">{label}</span> : null}
        <span
          className={`block truncate text-xs font-medium ${selected ? "text-white" : "text-slate-300"}`}
        >
          {ward.player_name ?? "Unknown player"}
        </span>
        <span className="mt-1 block truncate text-[10px] text-slate-600">
          {formatGameTime(ward.duration)} lifetime,{" "}
          <span
            className={wardOutcomeTextClass(ward.measurement?.outcome ?? null, ward.is_destroyed)}
          >
            {ward.measurement?.outcome === "dewarded" || (!ward.measurement && ward.is_destroyed)
              ? `dewarded by ${destroyingPlayer}`
              : outcome.toLowerCase()}
          </span>
        </span>
      </button>
      <span className="text-right">
        <span className="block font-mono text-[11px] text-slate-300">
          {formatGameTime(ward.time_placed)}
        </span>
        <a
          aria-label={`Open match ${ward.match_id} on OpenDota`}
          className="block font-mono text-[10px] text-slate-600 hover:text-slate-200 hover:underline"
          href={`https://www.opendota.com/matches/${ward.match_id}`}
          rel="noreferrer"
          target="_blank"
        >
          {ward.match_id}
        </a>
      </span>
    </div>
  );
}
