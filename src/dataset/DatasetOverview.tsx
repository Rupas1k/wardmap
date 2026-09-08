import { useMemo } from "react";
import { EmptyState } from "../components/ui";
import { InspectorSection, MetricRows } from "../inspector/InspectorPrimitives";
import LineChart, { timelineLabels } from "../inspector/LineChart";
import { analyzeDataset } from "../metrics/analyzeDataset";
import { formatGameTime } from "../metrics/wardMetrics";
import type { Cluster, ClusterWard, Side, Ward } from "../types";

function percentage(amount: number, total: number, digits = 1): string {
  return total ? `${((amount / total) * 100).toFixed(digits)}%` : "--";
}

export default function DatasetOverview({
  contextLabel,
  clusters,
  side,
  showUnclustered,
  wards,
  onChangeContext,
  onSelectCluster,
  onSelectWard,
}: {
  contextLabel: string | null;
  clusters: Cluster[];
  side: Side;
  showUnclustered: boolean;
  wards: Ward[];
  onChangeContext: () => void;
  onSelectCluster: (cluster: Cluster) => void;
  onSelectWard: (ward: ClusterWard) => void;
}) {
  const data = useMemo(() => analyzeDataset(wards), [wards]);
  const bestClusters = useMemo(
    () =>
      clusters
        .flatMap((cluster) => {
          const sideData = cluster[side];

          if (
            !sideData ||
            sideData.scouting_score === null ||
            (cluster.unclustered && !showUnclustered)
          ) {
            return [];
          }

          return [{ cluster, score: sideData.scouting_score, sideData }];
        })
        .sort(
          (left, right) =>
            right.score - left.score ||
            right.sideData.amount - left.sideData.amount ||
            left.cluster.cluster_id - right.cluster.cluster_id,
        )
        .slice(0, 5),
    [clusters, showUnclustered, side],
  );
  const visionMetrics = [
    data.scoutingScore,
    data.enemyHeroVision,
    data.uniqueEnemyHeroVision,
    data.heroesSpotted,
    data.heroRevealEvents,
    data.uniqueHeroRevealEvents,
    data.scoutingTracking,
    data.scoutingDiscovery,
  ];
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

      {visionMetrics.some((value) => value !== null) ? (
        <InspectorSection separated title="Vision per ward">
          <MetricRows
            rows={[
              ["Scouting score", data.scoutingScore?.toFixed(1) ?? "--"],
              ["Enemy hero vision", formatGameTime(data.enemyHeroVision)],
              ["Unique enemy vision", formatGameTime(data.uniqueEnemyHeroVision)],
              ["Heroes spotted", data.heroesSpotted?.toFixed(1) ?? "--"],
              ["Reveal events", data.heroRevealEvents?.toFixed(1) ?? "--"],
              ["Unique reveals", data.uniqueHeroRevealEvents?.toFixed(1) ?? "--"],
              ["Tracking", formatGameTime(data.scoutingTracking)],
              ["Discovery", formatGameTime(data.scoutingDiscovery)],
            ]}
          />
        </InspectorSection>
      ) : null}

      {bestClusters.length > 0 ? (
        <InspectorSection separated title="Best clusters by score">
          <div>
            {bestClusters.map(({ cluster, score, sideData }, index) => {
              const clusterWards = (cluster.wards ?? []).filter(
                (ward) => side === "all" || ward.is_radiant === (side === "radiant"),
              );
              const ward = sideData.amount === 1 ? (clusterWards[0] ?? null) : null;

              return (
                <button
                  className="grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2 py-2 text-left transition hover:bg-white/4"
                  key={cluster.cluster_id}
                  type="button"
                  onClick={() => (ward ? onSelectWard(ward) : onSelectCluster(cluster))}
                >
                  <span className="text-center font-mono text-[10px] text-slate-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-300">
                      {ward
                        ? (ward.player_name ?? "Unknown player")
                        : `${sideData.amount.toLocaleString()} wards`}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-600">
                      {ward
                        ? `Match ${ward.match_id} · placed ${formatGameTime(ward.time_placed)}`
                        : `${sideData.match_count.toLocaleString()} ${sideData.match_count === 1 ? "match" : "matches"} · mean placement ${formatGameTime(sideData.time_placed)}`}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-slate-200">{score.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        </InspectorSection>
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
