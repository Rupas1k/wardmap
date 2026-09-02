import { useMemo } from "react";
import { EmptyState } from "../components/ui";
import { InspectorSection, MetricRows } from "../inspector/InspectorPrimitives";
import LineChart, { timelineLabels } from "../inspector/LineChart";
import { analyzeDataset } from "../metrics/analyzeDataset";
import { formatGameTime } from "../metrics/wardMetrics";
import type { Ward } from "../types";

function percentage(amount: number, total: number, digits = 1): string {
  return total ? `${((amount / total) * 100).toFixed(digits)}%` : "--";
}

export default function DatasetOverview({
  contextLabel,
  wards,
  onChangeContext,
}: {
  contextLabel: string | null;
  wards: Ward[];
  onChangeContext: () => void;
}) {
  const data = useMemo(() => analyzeDataset(wards), [wards]);
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
            ["Wards", wards.length.toLocaleString()],
            ["Matches", data.matches.toLocaleString()],
            ["Median wards per match", data.medianWardsPerMatch?.toFixed(1) ?? "--"],
            ...(data.observerCount > 0 && data.sentryCount > 0
              ? ([
                  ["Observer wards", data.observerCount.toLocaleString()],
                  ["Sentry wards", data.sentryCount.toLocaleString()],
                ] as [string, string][])
              : []),
          ]}
        />
      </InspectorSection>

      <InspectorSection separated title="Placement timing">
        <div className="mb-2 flex justify-end gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-yellow-300" /> Placed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-rose-400" /> Dewarded
          </span>
        </div>
        <div className="h-52">
          <LineChart
            datasets={[
              {
                data: data.placedTimeline,
                label: "Placed",
                borderColor: "#fde047",
                backgroundColor: "#fde047",
              },
              {
                data: data.dewardedTimeline,
                label: "Dewarded",
                borderColor: "#fb7185",
                backgroundColor: "#fb7185",
              },
            ]}
            labels={timelineLabels}
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Game phases">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs">
          <span />
          <span className="text-right text-slate-600">Placements</span>
          <span className="text-right text-slate-600">Dewarded</span>
          {data.phases.map(([name, phase]) => (
            <div className="contents" key={name}>
              <span className="truncate py-1.5 text-slate-500">{name}</span>
              <span className="py-1.5 text-right text-slate-300">
                {percentage(phase.amount, wards.length, 0)}
              </span>
              <span className="py-1.5 text-right text-slate-300">
                {percentage(phase.dewarded, phase.amount, 0)}
              </span>
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Outcomes">
        <MetricRows
          rows={[
            ["Mean lifetime", formatGameTime(data.meanLifetime)],
            ["Dewarded within 2 min", percentage(data.dewardedWithinTwoMinutes, wards.length)],
            ["Dewarded within 4 min", percentage(data.dewardedWithinFourMinutes, wards.length)],
            ["Dewarded within 6 min", percentage(data.dewardedWithinSixMinutes, wards.length)],
          ]}
        />
      </InspectorSection>

      {coverageIssues.length > 0 ? (
        <p className="mt-5 border-t border-white/8 pt-4 text-[11px] leading-4 text-slate-600">
          Some breakdowns may be incomplete: {coverageIssues.map(([name]) => name).join(" and ")}{" "}
          data is missing for at least 5% of wards.
        </p>
      ) : null}
    </div>
  );
}
