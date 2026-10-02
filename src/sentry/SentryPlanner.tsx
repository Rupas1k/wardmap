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
    targetSide,
    sentryCount,
    minimumSpacing,
    timePreset,
    placements,
    selectedRank,
    showAllRanges,
    planning,
    error,
    setTargetSide,
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
  const waitingForData = wards.length === 0 || !elevations;

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
        targetSide,
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
            setError("No observer wards match this side and timing.");
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
      targetSide,
      sentryCount,
      setError,
      setPlacements,
      setPlanning,
      timePreset,
      wards,
    ],
  );

  useEffect(() => {
    if (wards.length === 0 || !elevations || placements.length > 0) {
      setPlanning(false);

      return;
    }

    const controller = new AbortController();

    generate(controller.signal);

    return () => {
      controller.abort();
      setPlanning(false);
    };
  }, [elevations, generate, placements.length, setPlanning, wards.length]);

  return (
    <div className="text-xs">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-100">Sentry planner</h2>
        {planning && result ? <span className="text-slate-500">Updating…</span> : null}
      </div>

      <div className="mt-4 space-y-3">
        <fieldset>
          <legend className="text-xs text-slate-500">Observer side</legend>
          <SwitchNav
            className="mt-1"
            options={[
              { value: "radiant", label: "Radiant" },
              { value: "dire", label: "Dire" },
            ]}
            value={targetSide}
            onChange={setTargetSide}
          />
        </fieldset>

        <label className="block text-xs text-slate-500">
          Ward timing
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
          <label className="text-xs text-slate-500">
            Sentries
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
          <label className="text-xs text-slate-500">
            Minimum spacing
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

      {error ? (
        <p aria-live="polite" className="mt-3 text-rose-300">
          {error}
        </p>
      ) : null}

      {!error && waitingForData ? (
        <p className="mt-4 border-t border-white/10 pt-4 text-slate-500">
          {wards.length === 0 ? "Load ward data to create a plan." : "Map data is still loading…"}
        </p>
      ) : null}

      {!error && planning && !result ? (
        <p aria-live="polite" className="mt-4 border-t border-white/10 pt-4 text-slate-500">
          Finding placements…
        </p>
      ) : null}

      {result ? (
        <div
          className={`mt-4 border-t border-white/10 pt-4 ${planning ? "opacity-70" : ""}`}
          aria-busy={planning}
        >
          <p className="text-slate-500">
            <span className="text-cyan-300 tabular-nums">
              {(result.coverage * 100).toFixed(1)}%
            </span>{" "}
            coverage, {result.coveredWards.toLocaleString()} of {result.totalWards.toLocaleString()}{" "}
            wards across {result.relevantMatches.toLocaleString()} matches
          </p>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-slate-400">
            <input
              checked={showAllRanges}
              className="accent-cyan-400"
              type="checkbox"
              onChange={(event) => setShowAllRanges(event.target.checked)}
            />
            Show all ranges
          </label>

          <section className="mt-3 border-t border-white/10 pt-3">
            <div className="space-y-px">
              {placements.map((placement) => (
                <button
                  aria-pressed={placement.rank === selectedRank}
                  className={`grid min-h-10 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2 text-left transition ${
                    placement.rank === selectedRank
                      ? "bg-cyan-400/8 text-slate-200 ring-1 ring-inset ring-cyan-300/35"
                      : "text-slate-400 hover:bg-white/4 hover:text-slate-200"
                  }`}
                  key={placement.rank}
                  type="button"
                  onClick={() => {
                    setSelectedRank(placement.rank);
                    centerMapAt(placement.x, placement.y);
                  }}
                >
                  <span className="font-medium text-cyan-300 tabular-nums">{placement.rank}</span>
                  <span className="truncate">
                    +{placement.additionalWards.toLocaleString()} wards
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    {placement.expectedPerMatch.toFixed(2)}/match
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
