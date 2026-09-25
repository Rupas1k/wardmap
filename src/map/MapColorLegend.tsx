import type { MapColorScale } from "./colorScale";

export default function MapColorLegend({ scale }: { scale: MapColorScale }) {
  if (scale.mode === "single") {
    return null;
  }

  return (
    <div className="absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)] border border-white/10 bg-slate-950/90 px-2.5 py-2 text-xs shadow-lg">
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="text-slate-300">{scale.label}</span>
        {scale.description ? (
          <span className="text-[10px] text-slate-500">{scale.description}</span>
        ) : null}
      </div>
      <div className="flex items-start">
        {scale.entries.map((entry, index) => (
          <div className="min-w-10 flex-1" key={`${entry.color}-${index}`}>
            <span className="block h-1.5" style={{ backgroundColor: entry.color }} />
            <span className="mt-1 block whitespace-nowrap text-center text-[10px] text-slate-500 tabular-nums">
              {entry.label}
            </span>
          </div>
        ))}
      </div>
      {scale.hasMissing ? (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className="h-2 w-2 shrink-0 rounded-full bg-slate-500" /> Missing
        </div>
      ) : null}
    </div>
  );
}
