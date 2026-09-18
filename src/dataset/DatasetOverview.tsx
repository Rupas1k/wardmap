import { useMemo } from "react";
import { wardOutcomeTextClass } from "../colors";
import { EmptyState } from "../components/ui";
import { InspectorSection, MetricRows } from "../inspector/InspectorPrimitives";
import { analyzeDataset } from "../metrics/analyzeDataset";
import { formatGameTime } from "../metrics/wardMetrics";
import type { Cluster, ClusterWard, Side, Ward, WardPopulation } from "../types";
import PlacementChart, { timelineLabels } from "./PlacementChart";

function percentage(amount: number, total: number, digits = 1): string {
  return total ? `${((amount / total) * 100).toFixed(digits)}%` : "--";
}

function outcomePercentage(
  outcome: NonNullable<Ward["measurement"]>["outcome"],
  amount: number,
  total: number,
) {
  return <span className={wardOutcomeTextClass(outcome)}>{percentage(amount, total)}</span>;
}

export default function DatasetOverview({
  contextLabel,
  wards,
  population,
  onChangeContext,
}: {
  contextLabel: string | null;
  clusters: Cluster[];
  selectedClusterId: number | null;
  side: Side;
  showUnclustered: boolean;
  wards: Ward[];
  population: WardPopulation | null;
  onChangeContext: () => void;
  onSelectCluster: (cluster: Cluster, openDetails: boolean) => void;
  onSelectWard: (ward: ClusterWard, openDetails: boolean) => void;
}) {
  const data = useMemo(() => analyzeDataset(wards), [wards]);
  const hasVisionMeasurements = data.measurement.measuredWards > 0;
  const hasLifecycleMeasurements = data.measurement.outcomeWards > 0;
  const coverageIssues = [
    ["player", data.missingPlayer] as const,
    ["side", data.missingSide] as const,
  ].filter(([, amount]) => amount / wards.length >= 0.05);

  if (wards.length === 0) {
    return <EmptyState className="py-10">No dataset records.</EmptyState>;
  }

  return (
    <div>
      {contextLabel ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-slate-200">
            {contextLabel} overview
          </p>
          <button
            className="shrink-0 text-[11px] text-slate-500 transition hover:text-slate-200"
            type="button"
            onClick={onChangeContext}
          >
            Change context
          </button>
        </div>
      ) : null}

      <InspectorSection title="Sample">
        <MetricRows
          rows={[
            ["Observer wards", data.observerCount.toLocaleString()],
            ["Matches represented", data.matches.toLocaleString()],
            ["Players represented", data.playerCount.toLocaleString()],
          ]}
        />
      </InspectorSection>

      {population?.selection_conditioned ? (
        <p className="mb-4 text-[11px] leading-4 text-slate-600">
          The eligible population is conditioned by a result or ward-performance filter and should
          not be used as an unbiased benchmark.
        </p>
      ) : null}

      <InspectorSection separated title="Placement timing">
        <div className="h-52">
          <PlacementChart
            labels={timelineLabels}
            placements={data.placedTimeline}
            removals={data.removedTimeline}
          />
        </div>
      </InspectorSection>

      {!hasVisionMeasurements && !hasLifecycleMeasurements ? (
        <InspectorSection separated title="Observer metrics">
          <p className="text-xs leading-5 text-slate-500">
            No observer ward measurements are available for this dataset.
          </p>
        </InspectorSection>
      ) : null}

      {hasVisionMeasurements ? (
        <InspectorSection separated title="Observer vision">
          <MetricRows
            rows={[
              ["Added vision, mean", formatGameTime(data.measurement.addedVision.mean)],
              ["Added vision, median", formatGameTime(data.measurement.addedVision.median)],
              ["Fresh sightings, mean", data.measurement.freshSightings.mean?.toFixed(1) ?? "--"],
              [
                "Fresh sightings, median",
                data.measurement.freshSightings.median?.toFixed(1) ?? "--",
              ],
            ]}
          />
        </InspectorSection>
      ) : null}

      {hasLifecycleMeasurements ? (
        <>
          <InspectorSection separated title="Ward lifetime">
            <MetricRows
              rows={[
                ["Time to deward, mean", formatGameTime(data.measurement.timeToDeward.mean)],
                ["Time to deward, median", formatGameTime(data.measurement.timeToDeward.median)],
                ["Ward lifetime, mean", formatGameTime(data.measurement.lifetime.mean)],
                ["Ward lifetime, median", formatGameTime(data.measurement.lifetime.median)],
              ]}
            />
          </InspectorSection>

          <InspectorSection separated title="Early dewards">
            <MetricRows
              rows={data.measurement.dewardedWithin.map((item): [string, string] => [
                `Dewarded within ${item.seconds / 60} min`,
                item.rate === null ? "--" : percentage(item.rate, 1),
              ])}
            />
          </InspectorSection>

          <InspectorSection separated title="Outcomes">
            <MetricRows
              rows={[
                [
                  "Dewarded",
                  outcomePercentage(
                    "dewarded",
                    data.measurement.outcomes.dewarded,
                    data.measurement.outcomeWards,
                  ),
                ],
                [
                  "Expired",
                  outcomePercentage(
                    "expired",
                    data.measurement.outcomes.expired,
                    data.measurement.outcomeWards,
                  ),
                ],
                [
                  "Removed by allies",
                  outcomePercentage(
                    "allied_removed",
                    data.measurement.outcomes.allied_removed,
                    data.measurement.outcomeWards,
                  ),
                ],
                [
                  "Match ended",
                  outcomePercentage(
                    "match_ended",
                    data.measurement.outcomes.match_ended,
                    data.measurement.outcomeWards,
                  ),
                ],
                [
                  "Unresolved removal",
                  outcomePercentage(
                    "unknown",
                    data.measurement.outcomes.unknown + data.measurement.outcomes.replay_ended,
                    data.measurement.outcomeWards,
                  ),
                ],
              ]}
            />
          </InspectorSection>
        </>
      ) : null}

      {coverageIssues.length > 0 ? (
        <p className="mt-5 border-t border-white/8 pt-4 text-[11px] leading-4 text-slate-600">
          Some breakdowns may be incomplete: {coverageIssues.map(([name]) => name).join(" and ")}{" "}
          data is missing for at least 5% of wards.
        </p>
      ) : null}
    </div>
  );
}
