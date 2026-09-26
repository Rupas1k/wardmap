import type { WardMeasurement } from "./types";

const outcomeTextClasses: Record<WardMeasurement["outcome"], string> = {
  dewarded: "text-rose-300",
  expired: "text-emerald-300",
  allied_removed: "text-slate-400",
  match_ended: "text-slate-400",
  replay_ended: "text-amber-300",
  unknown: "text-amber-300",
};

const outcomeDotClasses: Record<WardMeasurement["outcome"], string> = {
  dewarded: "bg-rose-400",
  expired: "bg-emerald-400",
  allied_removed: "bg-slate-400",
  match_ended: "bg-slate-400",
  replay_ended: "bg-amber-400",
  unknown: "bg-amber-400",
};

export function wardOutcomeTextClass(
  outcome: WardMeasurement["outcome"] | null,
  destroyed = false,
): string {
  return outcome ? outcomeTextClasses[outcome] : destroyed ? "text-rose-300" : "text-slate-400";
}

export function wardOutcomeDotClass(
  outcome: WardMeasurement["outcome"] | null,
  destroyed = false,
): string {
  return outcome ? outcomeDotClasses[outcome] : destroyed ? "bg-rose-400" : "bg-slate-400";
}

export function survivalColor(destroyed: number, amount: number): string {
  if (amount <= 0) {
    return "#64748b";
  }

  const survival = 1 - destroyed / amount;

  if (survival >= 0.8) {
    return "#34d399";
  }
  if (survival >= 0.6) {
    return "#a3e635";
  }
  if (survival >= 0.4) {
    return "#fbbf24";
  }
  if (survival >= 0.2) {
    return "#fb923c";
  }

  return "#fb7185";
}
