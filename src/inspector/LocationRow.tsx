import { useEffect } from "react";
import { selectableRowClass } from "../components/ui";
import { useMapStore } from "../state/mapState";

export default function LocationRow({
  clusterId,
  label,
  primaryValue,
  secondary,
  selected,
  onSelect,
}: {
  clusterId: number;
  label: string;
  primaryValue: string;
  secondary: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const setHoveredClusterId = useMapStore((state) => state.setHoveredClusterId);
  const hoveredClusterId = useMapStore((state) => state.hoveredClusterId);
  const hovered = clusterId === hoveredClusterId;

  useEffect(
    () => () => {
      if (useMapStore.getState().hoveredClusterId === clusterId) {
        setHoveredClusterId(null);
      }
    },
    [clusterId, setHoveredClusterId],
  );

  return (
    <button
      aria-pressed={selected}
      className={`w-full py-2 text-left ${selectableRowClass(selected, hovered)}`}
      type="button"
      onBlur={() => setHoveredClusterId(null)}
      onClick={onSelect}
      onFocus={() => setHoveredClusterId(clusterId)}
      onMouseEnter={() => setHoveredClusterId(clusterId)}
      onMouseLeave={() => setHoveredClusterId(null)}
    >
      <span className="block min-w-0">
        <span className="flex items-baseline justify-between gap-3">
          <span className={selected ? "text-xs text-white" : "text-xs text-slate-300"}>
            {label}
          </span>
          <span className="shrink-0 text-xs text-slate-300 tabular-nums">{primaryValue}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500 tabular-nums">{secondary}</span>
      </span>
    </button>
  );
}
