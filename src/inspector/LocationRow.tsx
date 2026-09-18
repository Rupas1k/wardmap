import { selectableRowClass } from "../components/ui";
import { formatGameTime } from "../metrics/wardMetrics";

export default function LocationRow({
  label,
  matchCount,
  metric,
  placement,
  selected,
  wardCount,
  onSelect,
}: {
  label: string;
  matchCount: number;
  metric: string;
  placement: number;
  selected: boolean;
  wardCount: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`w-full py-2 text-left ${selectableRowClass(selected)}`}
      type="button"
      onClick={onSelect}
    >
      <span className="block min-w-0">
        <span className="flex items-baseline justify-between gap-3">
          <span className={selected ? "text-xs text-white" : "text-xs text-slate-300"}>
            {label}
          </span>
          <span className="text-xs text-slate-400 tabular-nums">{wardCount}</span>
        </span>
        <span className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-500 tabular-nums">
          <span>
            {matchCount.toLocaleString()} {matchCount === 1 ? "match" : "matches"}
          </span>
          <span className="text-center">{metric}</span>
          <span className="text-right">{formatGameTime(placement)}</span>
        </span>
      </span>
    </button>
  );
}
