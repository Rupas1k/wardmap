import { useCallback, useEffect } from "react";
import runSentryPlanner from "./runSentryPlanner";
import { useMapStore } from "../state/mapState";
import { useSentryPlannerState } from "./state";
import type { SentryTimePreset } from "./state";
import { useWorkspaceStore } from "../state/workspaceState";
import { fieldControlClass, SwitchNav } from "../components/ui";

const timePresets = {
  all: { label: "Loaded time range", minimum: null, maximum: null },
  pregame: { label: "Pregame (-1:30–0:00)", minimum: -90, maximum: 0 },
  early: { label: "Early game (0–10)", minimum: 0, maximum: 10 * 60 },
  mid: { label: "Mid game (10–25)", minimum: 10 * 60, maximum: 25 * 60 },
  late: { label: "Late game (25+)", minimum: 25 * 60, maximum: null },
} as const;

export default function SentryPlanner() {
  const wards = useWorkspaceStore((state) => state.wards);
  const elevations = useMapStore((state) => state.elevations);
  const centerMapAt = useMapStore((state) => state.centerMapAt);
  const {
    placingSide,
    sentryCount,
    minimumSpacing,
    timePreset,
    placements,
    selectedRank,
    showAllRanges,
    planning,
    error,
    setPlacingSide,
    setSentryCount,
    setMinimumSpacing,
    setTimePreset,
    setPlacements,
    setSelectedRank,
    setShowAllRanges,
    setPlanning,
    setError,
  } = useSentryPlannerState();
  const result = placements.at(-1);
  const selected = placements.find((placement) => placement.rank === selectedRank) ?? null;

  const generate = useCallback(
    (signal?: AbortSignal) => {
      if (!elevations) {
        setError("GridNav data is still loading.");

        return;
      }

      const time = timePresets[timePreset];

      setPlanning(true);
      setError(null);

      void runSentryPlanner(
        wards,
        placingSide,
        sentryCount,
        minimumSpacing,
        time.minimum,
        time.maximum,
        elevations,
        signal,
      )
        .then((nextPlacements) => {
          if (signal?.aborted) {
            return;
          }

          setPlacements(nextPlacements);

          if (nextPlacements.length === 0) {
            setError("No opposing observer wards match these settings.");
          }
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") {
            return;
          }

          setError(reason instanceof Error ? reason.message : "Unable to plan sentries.");
        })
        .finally(() => {
          if (!signal?.aborted) {
            setPlanning(false);
          }
        });
    },
    [
      elevations,
      minimumSpacing,
      placingSide,
      sentryCount,
      setError,
      setPlacements,
      setPlanning,
      timePreset,
      wards,
    ],
  );

  useEffect(() => {
    if (wards.length === 0 || !elevations) {
      setPlanning(false);

      return;
    }

    const controller = new AbortController();

    generate(controller.signal);

    return () => {
      controller.abort();
      setPlanning(false);
    };
  }, [elevations, generate, setPlanning, wards.length]);

  return (
    <div>
      <div className="space-y-3">
        <fieldset>
          <legend className="text-[11px] text-slate-500">Recommend sentries for</legend>
          <SwitchNav
            className="mt-1 capitalize"
            options={[
              { value: "radiant", label: "Radiant" },
              { value: "dire", label: "Dire" },
            ]}
            value={placingSide}
            onChange={setPlacingSide}
          />
        </fieldset>

        <label className="block text-[11px] text-slate-500">
          Enemy ward timing
          <select
            className={fieldControlClass}
            value={timePreset}
            onChange={(event) => setTimePreset(event.target.value as SentryTimePreset)}
          >
            {Object.entries(timePresets).map(([value, preset]) => (
              <option key={value} value={value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-500">
            Number of sentries
            <input
              className={fieldControlClass}
              max="50"
              min="1"
              type="number"
              value={sentryCount}
              onChange={(event) =>
                setSentryCount(Math.min(50, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </label>
          <label className="text-[11px] text-slate-500">
            Keep placements apart
            <select
              className={fieldControlClass}
              value={minimumSpacing}
              onChange={(event) => setMinimumSpacing(Number(event.target.value))}
            >
              <option value="0">No minimum</option>
              <option value="500">500 units</option>
              <option value="1000">1,000 units</option>
              <option value="1500">1,500 units</option>
              <option value="2000">2,000 units</option>
            </select>
          </label>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

      {result ? (
        <>
          <div className="mt-4 border-t border-white/10 pt-3" aria-busy={planning}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium text-slate-300">Coverage</p>
              <div className="flex items-center gap-2">
                {planning ? <span className="text-[10px] text-slate-600">Updating…</span> : null}
                <span className="font-mono text-xs text-cyan-300">
                  {(result.coverage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {result.coveredWards.toLocaleString()} of {result.totalWards.toLocaleString()} wards ·{" "}
              {result.relevantMatches.toLocaleString()} matches
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                checked={showAllRanges}
                className="accent-cyan-400"
                type="checkbox"
                onChange={(event) => setShowAllRanges(event.target.checked)}
              />
              Show all detection ranges
            </label>
          </div>

          {selected ? (
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-xs font-medium text-slate-300">
                Selected placement {selected.rank}
              </p>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-[11px]">
                <dt className="text-slate-500">Additional wards</dt>
                <dd className="font-mono text-slate-300">
                  {selected.additionalWards.toLocaleString()}
                </dd>
                <dt className="text-slate-500">Expected per match</dt>
                <dd className="font-mono text-slate-300">{selected.expectedPerMatch.toFixed(2)}</dd>
                <dt className="text-slate-500">Cumulative coverage</dt>
                <dd className="font-mono text-slate-300">
                  {(selected.coverage * 100).toFixed(1)}%
                </dd>
              </dl>
            </div>
          ) : null}

          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-300">Recommended placements</p>
            <div className="space-y-1">
              {placements.map((placement) => (
                <button
                  className={`grid w-full grid-cols-[1.5rem_1fr_auto] items-center rounded-sm px-2 py-2 text-left text-xs transition ${
                    placement.rank === selectedRank
                      ? "bg-cyan-400/10 text-slate-200 ring-1 ring-inset ring-cyan-300/30"
                      : "text-slate-500 hover:bg-white/4 hover:text-slate-300"
                  }`}
                  key={placement.rank}
                  type="button"
                  onClick={() => {
                    setSelectedRank(placement.rank);
                    centerMapAt(placement.x, placement.y);
                  }}
                >
                  <span className="font-semibold text-cyan-300">{placement.rank}</span>
                  <span>+{placement.additionalWards.toLocaleString()} wards</span>
                  <span className="font-mono">{placement.expectedPerMatch.toFixed(2)}/match</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
