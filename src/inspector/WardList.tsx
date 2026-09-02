import { BsChevronLeft } from "react-icons/bs";
import { useMemo } from "react";
import { formatGameTime } from "../metrics/wardMetrics";
import { groupWardsByMatch, groupWardsByPlayer, sortWards } from "../metrics/groupWards";
import { useMapStore } from "../state/mapState";
import { contextIds } from "../state/analysisContext";
import { useSelectedCluster } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import type { WardOutcomeFilter, WardSort, WardView } from "../state/workspaceState";
import type { ClusterWard } from "../types";
import { EmptyState, fieldControlClass } from "../components/ui";
import { InspectorSection, MetricRows } from "./InspectorPrimitives";
import { BrowseTabs, DisclosureRow } from "./InspectorBrowse";
import WardRow, { destroyingPlayerName } from "./WardRow";

const wardSortOptions: Record<WardView, { value: WardSort; label: string }[]> = {
  wards: [
    { value: "placement", label: "Placement time" },
    { value: "lifetime", label: "Longest lifetime" },
    { value: "match", label: "Match" },
    { value: "player", label: "Player" },
  ],
  players: [
    { value: "amount", label: "Most wards" },
    { value: "player", label: "Player name" },
    { value: "placement", label: "Earliest average placement" },
    { value: "lifetime", label: "Longest average lifetime" },
  ],
  matches: [
    { value: "amount", label: "Most wards" },
    { value: "match", label: "Newest match" },
    { value: "placement", label: "Earliest placement" },
    { value: "lifetime", label: "Longest average lifetime" },
  ],
};

function WardReport({
  ward,
  compact = false,
  onBack,
}: {
  ward: ClusterWard;
  compact?: boolean;
  onBack?: () => void;
}) {
  const outcome = ward.is_destroyed ? "Dewarded" : "Not dewarded";

  return (
    <div className={compact ? "mb-2" : ""}>
      {onBack ? (
        <button
          className="-ml-1 mb-2 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-xs text-slate-500 transition hover:bg-white/4 hover:text-slate-200"
          type="button"
          onClick={onBack}
        >
          <BsChevronLeft className="text-[10px]" />
          Location summary
        </button>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">
          {ward.player_name ?? "Unknown player"}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {ward.team_name ?? "Unknown team"} vs {ward.opponent_team_name ?? "Unknown opponent"}
          <span className={ward.is_destroyed ? "text-rose-300" : "text-emerald-300"}>
            {` · ${outcome}`}
          </span>
        </p>
      </div>

      <InspectorSection title="Placement">
        <MetricRows
          rows={[
            ["Side", ward.is_radiant ? "Radiant" : "Dire"],
            ["Placed", formatGameTime(ward.time_placed)],
            ["Lifetime", formatGameTime(ward.duration)],
            ["Match result", ward.team_won === null ? "Unknown" : ward.team_won ? "Won" : "Lost"],
          ]}
        />
        <a
          className="mt-1 inline-flex text-xs text-cyan-400 hover:text-cyan-200 hover:underline"
          href={`https://www.opendota.com/matches/${ward.match_id}`}
          rel="noreferrer"
          target="_blank"
        >
          Open match {ward.match_id} on OpenDota ↗
        </a>
      </InspectorSection>

      {ward.is_destroyed ? (
        <p className="mt-3 text-xs text-slate-500">
          Dewarded by <span className="text-slate-300">{destroyingPlayerName(ward)}</span>
        </p>
      ) : null}
    </div>
  );
}

export default function WardList() {
  const view = useWorkspaceStore((state) => state.wardView);
  const setView = useWorkspaceStore((state) => state.setWardView);
  const outcome = useWorkspaceStore((state) => state.wardOutcomeFilter);
  const setOutcome = useWorkspaceStore((state) => state.setWardOutcomeFilter);
  const sort = useWorkspaceStore((state) => state.wardSort);
  const setSort = useWorkspaceStore((state) => state.setWardSort);
  const cluster = useSelectedCluster();
  const side = useMapStore((state) => state.currentSide);
  const context = useWorkspaceStore((state) => state.analysisContext);
  const setContextRefinement = useWorkspaceStore((state) => state.setContextRefinement);
  const { playerId: selectedPlayerId, matchId: selectedMatchId } = contextIds(context);
  const selectedWardId = useMapStore((state) => state.selectedWardId);
  const setSelectedWardId = useMapStore((state) => state.setSelectedWardId);

  const allWards = useMemo(
    () =>
      (cluster?.wards ?? []).filter(
        (ward) => side === "all" || ward.is_radiant === (side === "radiant"),
      ),
    [cluster, side],
  );
  const wards = useMemo(
    () =>
      sortWards(
        allWards.filter(
          (ward) =>
            outcome === "all" || (outcome === "dewarded" ? ward.is_destroyed : !ward.is_destroyed),
        ),
        sort,
      ),
    [allWards, outcome, sort],
  );
  const selectedWard = allWards.find((ward) => ward.id === selectedWardId) ?? null;

  const playerGroups = useMemo(() => groupWardsByPlayer(wards, sort), [sort, wards]);
  const matchGroups = useMemo(() => groupWardsByMatch(wards, sort), [sort, wards]);

  function changeView(nextView: WardView) {
    setView(nextView);
    setSort(nextView === "wards" ? "placement" : "amount");
    setContextRefinement(null);
  }

  if (allWards.length === 1) {
    return <WardReport ward={allWards[0]!} />;
  }

  return (
    <div>
      {selectedWard ? (
        <WardReport compact ward={selectedWard} onBack={() => setSelectedWardId(null)} />
      ) : null}

      <h3 className="mt-5 mb-3 border-t border-white/8 pt-4 text-xs font-medium text-slate-400">
        Wards at this location
      </h3>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {wards.length.toLocaleString()} of {allWards.length.toLocaleString()} wards
        </p>
        <BrowseTabs active={view} options={["wards", "players", "matches"]} onChange={changeView} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-600">
          Outcome
          <select
            className={fieldControlClass}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as WardOutcomeFilter)}
          >
            <option value="all">All</option>
            <option value="survived">Not dewarded</option>
            <option value="dewarded">Dewarded</option>
          </select>
        </label>
        <label className="text-[10px] text-slate-600">
          Sort
          <select
            className={fieldControlClass}
            value={sort}
            onChange={(event) => setSort(event.target.value as WardSort)}
          >
            {wardSortOptions[view].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {wards.length === 0 ? (
        <EmptyState>No wards match this outcome.</EmptyState>
      ) : view === "wards" ? (
        <div className="space-y-1">
          {wards.map((ward) => (
            <WardRow key={ward.id} ward={ward} />
          ))}
        </div>
      ) : view === "players" ? (
        <div className="space-y-1">
          {playerGroups.map((player) => {
            const expanded =
              selectedPlayerId === player.id ||
              (selectedPlayerId === null &&
                player.wards.some((ward) => ward.id === selectedWardId));

            return (
              <div key={player.id}>
                <DisclosureRow
                  expanded={expanded}
                  label={player.name}
                  trailing={<span className="text-xs text-slate-500">{player.wards.length}</span>}
                  onClick={() => {
                    setSelectedWardId(null);
                    setContextRefinement(expanded ? null : { kind: "player", id: player.id });
                  }}
                />
                {expanded ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {player.wards.map((ward) => (
                      <WardRow key={ward.id} ward={ward} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {matchGroups.map(([matchId, matchWards]) => {
            const first = matchWards[0]!;
            const expanded =
              selectedMatchId === matchId ||
              (selectedMatchId === null && matchWards.some((ward) => ward.id === selectedWardId));

            return (
              <div key={matchId}>
                <DisclosureRow
                  expanded={expanded}
                  label={<span className="font-mono">{matchId}</span>}
                  meta={`${first.team_name ?? "Unknown"} vs ${first.opponent_team_name ?? "Unknown"}`}
                  trailing={<span className="text-xs text-slate-500">{matchWards.length}</span>}
                  onClick={() => {
                    setSelectedWardId(null);
                    setContextRefinement(expanded ? null : { kind: "match", id: matchId });
                  }}
                />
                {expanded ? (
                  <div className="mt-1 space-y-1 pl-3">
                    {matchWards.map((ward) => (
                      <WardRow key={ward.id} ward={ward} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
