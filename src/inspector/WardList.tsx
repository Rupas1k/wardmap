import { BsChevronLeft, BsGeoAlt, BsGeoAltFill } from "react-icons/bs";
import { useEffect, useMemo, useState } from "react";
import { fetchWardEvidence } from "../api/fetchWardEvidence";
import { wardOutcomeTextClass } from "../colors";
import { formatGameTime, formatWardOutcome } from "../metrics/wardMetrics";
import { groupWardsByMatch, groupWardsByPlayer, sortWards } from "../metrics/groupWards";
import { useMapStore } from "../state/mapState";
import { contextIds } from "../state/analysisContext";
import { useSelectedCluster } from "../state/mapSelectors";
import { useWorkspaceStore } from "../state/workspaceState";
import type { WardOutcomeFilter, WardSort, WardView } from "../state/workspaceState";
import type { ClusterWard, WardSighting } from "../types";
import { EmptyState, fieldControlClass } from "../components/ui";
import { InspectorSection, MetricRows } from "./InspectorPrimitives";
import { BrowseTabs, DisclosureRow } from "./InspectorBrowse";
import WardRow, { destroyingPlayerName } from "./WardRow";

const wardSortOptions: Record<WardView, { value: WardSort; label: string }[]> = {
  wards: [
    { value: "placement", label: "Placement time" },
    { value: "lifetime", label: "Longest lifetime" },
    { value: "added-vision", label: "Most added vision" },
    { value: "fresh-sightings", label: "Most fresh sightings" },
    { value: "match", label: "Match" },
    { value: "player", label: "Player" },
  ],
  players: [
    { value: "amount", label: "Most wards" },
    { value: "player", label: "Player name" },
    { value: "placement", label: "Earliest average placement" },
    { value: "lifetime", label: "Longest average lifetime" },
    { value: "added-vision", label: "Most added vision" },
    { value: "fresh-sightings", label: "Most fresh sightings" },
  ],
  matches: [
    { value: "amount", label: "Most wards" },
    { value: "match", label: "Newest match" },
    { value: "placement", label: "Earliest placement" },
    { value: "lifetime", label: "Longest average lifetime" },
    { value: "added-vision", label: "Most added vision" },
    { value: "fresh-sightings", label: "Most fresh sightings" },
  ],
};

function accountId(steamId: string): number | null {
  try {
    const value = BigInt(steamId);
    const universe = (value >> 56n) & 0xffn;
    const accountType = (value >> 52n) & 0xfn;
    const instance = (value >> 32n) & 0xfffffn;
    const account = value & 0xffffffffn;

    if (universe !== 1n || accountType !== 1n || instance !== 1n || account === 0n) {
      return null;
    }

    return Number(account);
  } catch {
    return null;
  }
}

function heroName(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/^CDOTA_Unit_Hero_/, "")
    .replace(/^npc_dota_hero_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function formatSeconds(value: number): string {
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} sec`;
}

function WardReport({
  ward,
  compact = false,
  onBack,
}: {
  ward: ClusterWard;
  compact?: boolean;
  onBack?: () => void;
}) {
  const players = useWorkspaceStore((state) => state.players);
  const opponentPlayers = useWorkspaceStore((state) => state.opponentPlayers);
  const sightingSelectionId = useMapStore((state) => state.sightingSelectionId);
  const showSightingAt = useMapStore((state) => state.showSightingAt);
  const clearSighting = useMapStore((state) => state.clearSighting);
  const [sightings, setSightings] = useState<WardSighting[] | null>(null);
  const [sightingError, setSightingError] = useState(false);
  const outcome = ward.measurement
    ? formatWardOutcome(ward.measurement.outcome)
    : ward.is_destroyed
      ? "Dewarded"
      : "Not dewarded";
  const removalSourceLabel =
    ward.measurement?.outcome === "dewarded" || (!ward.measurement && ward.is_destroyed)
      ? "Dewarded by"
      : ward.measurement?.outcome === "allied_removed"
        ? "Removed by ally"
        : null;
  const hasSightings = (ward.measurement?.fresh_sightings ?? 0) > 0;
  const playerNames = new Map(
    [...players, ...opponentPlayers].map((player) => [player.id, player.name]),
  );
  const loadedSightings = sightings ?? [];
  const uniqueTargets = new Set(
    loadedSightings.map((event) => event.target_player_slot ?? event.target_steam_id ?? "unknown"),
  ).size;
  const longestUnseen = loadedSightings.reduce(
    (longest, event) => Math.max(longest, event.hidden_seconds),
    0,
  );

  useEffect(() => {
    let active = true;

    if (!ward.is_obs || !ward.measurement || !hasSightings) {
      setSightings([]);
      setSightingError(false);

      return;
    }

    setSightings(null);
    setSightingError(false);
    void fetchWardEvidence(ward.id)
      .then((evidence) => {
        if (active) {
          setSightings(evidence.sightings);
        }
      })
      .catch(() => {
        if (active) {
          setSightings([]);
          setSightingError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [hasSightings, ward.id, ward.is_obs, ward.measurement]);

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
          <span
            className={wardOutcomeTextClass(ward.measurement?.outcome ?? null, ward.is_destroyed)}
          >
            {`, ${outcome.toLowerCase()}`}
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

      {ward.is_obs && ward.measurement ? (
        <>
          <InspectorSection separated title="Observer vision">
            <MetricRows
              rows={[
                ["Added vision", formatGameTime(ward.measurement.added_vision_seconds)],
                [
                  "Fresh sightings",
                  ward.measurement.fresh_sightings === null
                    ? "--"
                    : formatCount(ward.measurement.fresh_sightings),
                ],
                ["Enemies spotted", sightings === null ? "--" : uniqueTargets.toLocaleString()],
                [
                  "Longest unseen",
                  sightings === null
                    ? "--"
                    : loadedSightings.length
                      ? formatGameTime(longestUnseen)
                      : "--",
                ],
                [
                  "Outcome",
                  <span className={wardOutcomeTextClass(ward.measurement.outcome)} key="outcome">
                    {formatWardOutcome(ward.measurement.outcome)}
                  </span>,
                ],
              ]}
            />
          </InspectorSection>
          {sightings === null || sightingError || loadedSightings.length ? (
            <InspectorSection separated title="Enemy sightings">
              {sightings === null ? (
                <p className="py-2 text-xs text-slate-500">Loading events…</p>
              ) : sightingError ? (
                <p className="py-2 text-xs text-rose-300">Unable to load events.</p>
              ) : (
                <table className="w-full table-fixed text-xs">
                  <thead className="text-left text-xs text-slate-500">
                    <tr>
                      <th className="w-14 py-2 font-normal">Time</th>
                      <th className="py-2 font-normal">Enemy</th>
                      <th className="w-16 py-2 text-right font-normal">Unseen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {loadedSightings.map((event, index) => {
                      const targetId = event.target_steam_id
                        ? accountId(event.target_steam_id)
                        : null;
                      const playerName =
                        event.target_player_name ??
                        (targetId === null ? null : playerNames.get(targetId));
                      const targetHero = heroName(event.target_hero_name);
                      const combinedRoutes = event.segments
                        .map((segment) => segment.route.map((point) => point.position))
                        .filter((route) => route.length > 1);
                      const fullRoutePosition =
                        event.segments[0]?.start_position ?? event.target_position;
                      const firstSegmentTime = event.segments[0]?.time ?? event.time;
                      const totalVisibleSeconds = event.segments.reduce(
                        (total, segment) => total + (segment.visible_seconds ?? 0),
                        0,
                      );
                      const eventKey = `${ward.id}-${event.sample_tick ?? event.time}-${event.target_player_slot ?? event.target_steam_id ?? index}`;
                      const fullRouteId = `${eventKey}-all`;
                      const fallbackName =
                        event.target_player_slot === null
                          ? "Enemy player"
                          : `Enemy ${event.target_player_slot + 1}`;

                      return (
                        <tr
                          key={`${event.sample_tick ?? event.time}-${event.target_player_slot ?? event.target_steam_id ?? index}`}
                        >
                          <td className="py-3 align-top font-mono text-xs text-slate-500">
                            {formatGameTime(event.time)}
                          </td>
                          <td className="min-w-0 py-3 pr-2">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {playerName ?? fallbackName}
                            </p>
                            {targetHero ? (
                              <p className="truncate text-xs text-slate-500">{targetHero}</p>
                            ) : null}
                            <div className="mt-2 space-y-1">
                              {fullRoutePosition && combinedRoutes.length > 1 ? (
                                <SightingPathButton
                                  detail={`${combinedRoutes.length} paths, ${formatGameTime(totalVisibleSeconds)} visible`}
                                  label="All movement"
                                  selected={sightingSelectionId === fullRouteId}
                                  onClear={clearSighting}
                                  onShow={() =>
                                    showSightingAt(fullRouteId, fullRoutePosition, combinedRoutes)
                                  }
                                />
                              ) : null}
                              <div
                                className={
                                  combinedRoutes.length > 1
                                    ? "ml-3 space-y-1 border-l border-white/10 pl-2"
                                    : "space-y-1"
                                }
                              >
                                {event.segments.map((segment, segmentIndex) => {
                                  const startPosition = segment.start_position;
                                  const route = segment.route.map((point) => point.position);
                                  const selectionId = `${eventKey}-${segmentIndex}`;
                                  const segmentTime = event.time + segment.time - firstSegmentTime;
                                  const segmentLabel =
                                    segmentIndex === 0
                                      ? `First view at ${formatGameTime(segmentTime)}`
                                      : `Back at ${formatGameTime(segmentTime)} after ${formatSeconds(segment.gap_seconds ?? 0)}`;
                                  const durationLabel =
                                    segment.visible_seconds === null
                                      ? "No exit captured"
                                      : `Visible ${formatSeconds(segment.visible_seconds)}`;

                                  return startPosition ? (
                                    <SightingPathButton
                                      detail={durationLabel}
                                      key={selectionId}
                                      label={segmentLabel}
                                      nested={combinedRoutes.length > 1}
                                      selected={sightingSelectionId === selectionId}
                                      onClear={clearSighting}
                                      onShow={() =>
                                        showSightingAt(
                                          selectionId,
                                          startPosition,
                                          route.length > 1 ? [route] : [],
                                        )
                                      }
                                    />
                                  ) : (
                                    <div
                                      className="grid grid-cols-[1fr_auto] gap-3 px-2 py-1.5 text-[11px] text-slate-500"
                                      key={selectionId}
                                    >
                                      <span>{segmentLabel}</span>
                                      <span>{durationLabel}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right align-top text-sm font-medium text-slate-200">
                            {Math.round(event.hidden_seconds)} sec
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </InspectorSection>
          ) : null}
        </>
      ) : null}

      {removalSourceLabel ? (
        <p className="mt-3 text-xs text-slate-500">
          {removalSourceLabel} <span className="text-slate-300">{destroyingPlayerName(ward)}</span>
        </p>
      ) : null}
    </div>
  );
}

function SightingPathButton({
  detail,
  label,
  nested = false,
  selected,
  onClear,
  onShow,
}: {
  detail: string;
  label: string;
  nested?: boolean;
  selected: boolean;
  onClear: () => void;
  onShow: () => void;
}) {
  return (
    <button
      aria-label={`${selected ? "Hide" : "Show"} ${label.toLowerCase()} movement on map`}
      aria-pressed={selected}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-sm px-2 text-left text-[11px] transition ${
        nested ? "py-1.5" : "border border-white/8 bg-white/3 py-2"
      } ${
        selected
          ? "bg-amber-300/8 text-amber-200 ring-1 ring-inset ring-amber-300/35"
          : nested
            ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            : "text-slate-300 hover:border-white/15 hover:bg-white/6"
      }`}
      type="button"
      onClick={selected ? onClear : onShow}
    >
      {selected ? (
        <BsGeoAltFill aria-hidden="true" className="text-amber-300" />
      ) : (
        <BsGeoAlt aria-hidden="true" className="text-cyan-500" />
      )}
      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
        <span className="leading-4 whitespace-normal">{label}</span>
        <span className={`whitespace-nowrap ${selected ? "text-amber-300/70" : "text-slate-500"}`}>
          {detail}
        </span>
      </span>
    </button>
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
        allWards.filter((ward) => {
          if (outcome === "all") {
            return true;
          }

          const wardOutcome = ward.measurement?.outcome;

          return outcome === "unresolved_removal"
            ? wardOutcome === "unknown" || wardOutcome === "replay_ended"
            : wardOutcome === outcome;
        }),
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
      {selectedWard ? <WardReport compact ward={selectedWard} /> : null}

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
            <option value="dewarded">Dewarded</option>
            <option value="expired">Expired</option>
            <option value="allied_removed">Removed by allies</option>
            <option value="match_ended">Match ended</option>
            <option value="unresolved_removal">Unresolved removal</option>
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
