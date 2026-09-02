import type { ReactNode, SelectHTMLAttributes } from "react";
import type { League, Player, Side, Team } from "../types";
import { numericIds } from "./model";
import type { DatasetSettings, TeamResult, WardOutcome, WardType } from "./model";
import { Field, GameTimeRange, Range, SelectionDialog } from "./DatasetFormControls";
import type { SelectionOption } from "./DatasetFormControls";
import { fieldControlClass } from "../components/ui";

interface DatasetControlsProps {
  leagues: readonly League[];
  players: readonly Player[];
  opponentPlayers: readonly Player[];
  teams: readonly Team[];
  settings: DatasetSettings;
  setSettings: (settings: DatasetSettings) => void;
}

function selectionSummary(ids: number[], options: SelectionOption[], empty: string) {
  if (ids.length === 0) {
    return empty;
  }
  if (ids.length === 1) {
    return options.find((option) => option.id === ids[0])?.name ?? "1 selected";
  }

  return `${ids.length} selected`;
}

function playerSelectionOptions(players: readonly Player[], selectedIds: number[]) {
  const options: SelectionOption[] = players
    .map((player) => ({
      id: player.id,
      name: player.name ?? `Player ${player.id}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id);

  for (const id of selectedIds) {
    if (!options.some((option) => option.id === id)) {
      options.push({ id, name: `Player ${id}`, meta: "Unavailable" });
    }
  }

  return options;
}

function CompactSelect({
  children,
  label,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; label: string }) {
  return (
    <label className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 py-2.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <select
        className="min-w-0 justify-self-end bg-transparent text-right text-xs text-slate-200 outline-none [color-scheme:dark] disabled:opacity-40 [&>option]:bg-slate-900 [&>option]:text-slate-200"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export default function DatasetControls({
  leagues,
  players,
  opponentPlayers,
  teams,
  settings,
  setSettings,
}: DatasetControlsProps) {
  const update = <K extends keyof DatasetSettings>(key: K, value: DatasetSettings[K]) =>
    setSettings({ ...settings, [key]: value });
  const sourceAvailable = settings.leagueIds.length > 0;

  const leagueOptions = leagues.map((league) => ({
    id: league.id,
    name: league.name,
    meta: `Map ${league.version}`,
  }));

  const teamOptions: SelectionOption[] = teams.map((team) => ({
    id: team.id,
    name: team.name ?? `Team ${team.id}`,
    meta: team.tag ?? undefined,
  }));

  for (const id of [...settings.teamIds, ...settings.opponentTeamIds]) {
    if (!teamOptions.some((option) => option.id === id)) {
      teamOptions.push({ id, name: `Team ${id}`, meta: "Unavailable" });
    }
  }

  const selectedPlayerIds = numericIds(settings.playerIds).map(Number);
  const selectedOpponentPlayerIds = numericIds(settings.opponentPlayerIds).map(Number);
  const placingPlayerOptions = playerSelectionOptions(players, selectedPlayerIds);
  const opponentPlayerOptions = playerSelectionOptions(opponentPlayers, selectedOpponentPlayerIds);

  return (
    <>
      <div>
        <SelectionDialog
          label="Leagues"
          options={leagueOptions}
          searchPlaceholder="Search leagues"
          selectedIds={settings.leagueIds}
          setSelectedIds={(leagueIds) => {
            const addedLeagueId = leagueIds.find((id) => !settings.leagueIds.includes(id));

            if (addedLeagueId === undefined) {
              update("leagueIds", leagueIds);

              return;
            }

            const version = leagues.find((league) => league.id === addedLeagueId)?.version;
            const compatibleIds = leagueIds.filter(
              (id) => leagues.find((league) => league.id === id)?.version === version,
            );

            update("leagueIds", compatibleIds);
          }}
          summary={selectionSummary(settings.leagueIds, leagueOptions, "Select leagues")}
        />
        <section className="mt-3 border-t border-white/7 pt-3">
          <h3 className="pb-1 text-[11px] font-medium text-slate-400">Ward placed by</h3>
          <SelectionDialog
            disabled={!sourceAvailable}
            label="Team"
            options={teamOptions}
            searchPlaceholder="Search teams"
            selectedIds={settings.teamIds}
            setSelectedIds={(teamIds) => setSettings({ ...settings, teamIds, playerIds: "" })}
            summary={selectionSummary(settings.teamIds, teamOptions, "All teams")}
          />
          <SelectionDialog
            disabled={!sourceAvailable}
            label="Player"
            options={placingPlayerOptions}
            searchPlaceholder="Search players or ID"
            selectedIds={selectedPlayerIds}
            setSelectedIds={(playerIds) => update("playerIds", playerIds.join(","))}
            summary={selectionSummary(selectedPlayerIds, placingPlayerOptions, "All players")}
          />
        </section>
        <section className="mt-3">
          <h3 className="pb-1 text-[11px] font-medium text-slate-400">Playing against</h3>
          <SelectionDialog
            disabled={!sourceAvailable}
            label="Team"
            options={teamOptions}
            searchPlaceholder="Search teams"
            selectedIds={settings.opponentTeamIds}
            setSelectedIds={(opponentTeamIds) =>
              setSettings({
                ...settings,
                opponentTeamIds,
                opponentPlayerIds: "",
                destroyedByPlayerIds: "",
              })
            }
            summary={selectionSummary(settings.opponentTeamIds, teamOptions, "All teams")}
          />
          <SelectionDialog
            disabled={!sourceAvailable}
            label="Player"
            options={opponentPlayerOptions}
            searchPlaceholder="Search players or ID"
            selectedIds={selectedOpponentPlayerIds}
            setSelectedIds={(playerIds) => update("opponentPlayerIds", playerIds.join(","))}
            summary={selectionSummary(
              selectedOpponentPlayerIds,
              opponentPlayerOptions,
              "All players",
            )}
          />
        </section>
        <section className="mt-3">
          <h3 className="pb-1 text-[11px] font-medium text-slate-400">Dewarding</h3>
          <CompactSelect
            label="Outcome"
            value={settings.outcome}
            onChange={(event) => update("outcome", event.target.value as WardOutcome)}
          >
            <option value="all">All</option>
            <option value="survived">Not dewarded</option>
            <option value="destroyed">Dewarded</option>
          </CompactSelect>
        </section>
        <section className="mt-3 border-t border-white/7 pt-3">
          <h3 className="pb-1 text-[11px] font-medium text-slate-400">Ward and match</h3>
          <CompactSelect
            label="Side"
            value={settings.side}
            onChange={(event) => update("side", event.target.value as Side)}
          >
            <option value="all">Both</option>
            <option value="radiant">Radiant</option>
            <option value="dire">Dire</option>
          </CompactSelect>
          <CompactSelect
            label="Ward type"
            value={settings.wardType}
            onChange={(event) => update("wardType", event.target.value as WardType)}
          >
            <option value="observer">Observers</option>
            <option value="sentry">Sentries</option>
            <option value="all">Both</option>
          </CompactSelect>
          <CompactSelect
            label="Match result"
            value={settings.teamResult}
            onChange={(event) => update("teamResult", event.target.value as TeamResult)}
          >
            <option value="all">All</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </CompactSelect>
        </section>
      </div>
      <GameTimeRange
        label="Placement time"
        maximumMinutes={settings.maximumGameMinute}
        minimumMinutes={settings.minimumGameMinute}
        setMaximumMinutes={(value) => update("maximumGameMinute", value)}
        setMinimumMinutes={(value) => update("minimumGameMinute", value)}
      />
      <section className="mt-4 border-t border-white/7 pt-3">
        <h3 className="text-[11px] font-medium text-slate-400">Advanced</h3>
        <div className="mt-3 space-y-3">
          <Field label="Match IDs">
            <input
              className={fieldControlClass}
              placeholder="Comma separated"
              value={settings.matchIds}
              onChange={(event) => update("matchIds", event.target.value)}
            />
          </Field>
          <Range
            label="Match minutes"
            min={settings.minimumMatchDuration}
            max={settings.maximumMatchDuration}
            setMin={(value) => update("minimumMatchDuration", value)}
            setMax={(value) => update("maximumMatchDuration", value)}
          />
          <Range
            label="Ward lifetime (seconds)"
            min={settings.minimumWardLifetime}
            max={settings.maximumWardLifetime}
            setMin={(value) => update("minimumWardLifetime", value)}
            setMax={(value) => update("maximumWardLifetime", value)}
          />
        </div>
      </section>
    </>
  );
}
