import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  BsArrowDown,
  BsArrowUp,
  BsFunnel,
  BsMap,
  BsPlus,
  BsSearch,
  BsThreeDots,
  BsTrash,
} from "react-icons/bs";
import Popup from "../components/Popup";
import HeroName from "../components/HeroName";
import { formControlClass } from "../components/ui";
import { mapPatchLabel, mapPatchLabels } from "../map/versions";
import type { ImportedCollection, ImportedLibrary, ImportedMatch } from "./model";

export interface ReplayLibraryProps {
  activeCollection: ImportedCollection | null;
  activeCollectionIndex: number;
  allVisibleSelected: boolean;
  bulkCollectionId: string;
  collectionFilter: string;
  collectionName: string;
  collectionStatus: string | null;
  creatingCollection: boolean;
  importedWithinDays: "all" | number;
  library: ImportedLibrary;
  mapVersion: number;
  onlyMine: boolean;
  playerNames: ReadonlyMap<number, string>;
  resultFilter: "all" | "won" | "lost";
  search: string;
  selectAllInput: RefObject<HTMLInputElement | null>;
  selected: number[];
  updatingCollection: boolean;
  versionFilter: "all" | number;
  visibleMatches: ImportedMatch[];
  createCollection: () => Promise<void>;
  duplicateCollection: (collection: ImportedCollection) => Promise<void>;
  exportCollection: (collection: ImportedCollection) => void;
  moveCollection: (id: string, direction: -1 | 1) => Promise<void>;
  removeCollection: (collection: ImportedCollection) => Promise<void>;
  removeMatches: (matchIds: readonly number[]) => Promise<void>;
  renameCollection: (collection: ImportedCollection) => Promise<void>;
  setBulkCollectionId: Dispatch<SetStateAction<string>>;
  setCollectionFilter: Dispatch<SetStateAction<string>>;
  setCollectionName: Dispatch<SetStateAction<string>>;
  setCollectionStatus: Dispatch<SetStateAction<string | null>>;
  setCreatingCollection: Dispatch<SetStateAction<boolean>>;
  setImportedWithinDays: Dispatch<SetStateAction<"all" | number>>;
  setMatchesInCollection: (
    matchIds: readonly number[],
    id: string,
    included: boolean,
  ) => Promise<void>;
  setOnlyMine: Dispatch<SetStateAction<boolean>>;
  setResultFilter: Dispatch<SetStateAction<"all" | "won" | "lost">>;
  setSearch: Dispatch<SetStateAction<string>>;
  setSelected: Dispatch<SetStateAction<number[]>>;
  setVersionFilter: Dispatch<SetStateAction<"all" | number>>;
  showMatches: (ids: readonly number[]) => void;
  updateCollection: (id: string, update: Partial<ImportedCollection>) => Promise<void>;
}

const primaryButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-cyan-300 transition hover:bg-white/5 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-35";
const secondaryButtonClass =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35";

function duration(seconds: number | null) {
  if (seconds === null) {
    return "Duration unknown";
  }

  const rounded = Math.round(seconds);

  return Math.floor(rounded / 60) + ":" + String(rounded % 60).padStart(2, "0");
}

function playerFor(match: ImportedMatch, accountIds: readonly number[]) {
  return match.players.find((player) => accountIds.includes(player.id));
}

function matchDate(match: ImportedMatch): string {
  return match.startedAt === null ? "Unknown" : new Date(match.startedAt).toLocaleDateString();
}

export default function ReplayLibrary(props: ReplayLibraryProps) {
  const {
    activeCollection,
    activeCollectionIndex,
    allVisibleSelected,
    bulkCollectionId,
    collectionFilter,
    collectionName,
    collectionStatus,
    creatingCollection,
    importedWithinDays,
    library,
    mapVersion,
    onlyMine,
    playerNames,
    resultFilter,
    search,
    selectAllInput,
    selected,
    updatingCollection,
    versionFilter,
    visibleMatches,
    createCollection,
    duplicateCollection,
    exportCollection,
    moveCollection,
    removeCollection,
    removeMatches,
    renameCollection,
    setBulkCollectionId,
    setCollectionFilter,
    setCollectionName,
    setCollectionStatus,
    setCreatingCollection,
    setImportedWithinDays,
    setMatchesInCollection,
    setOnlyMine,
    setResultFilter,
    setSearch,
    setSelected,
    setVersionFilter,
    showMatches,
    updateCollection,
  } = props;

  const filtersActive =
    search.trim().length > 0 ||
    collectionFilter !== "all" ||
    resultFilter !== "all" ||
    importedWithinDays !== "all" ||
    versionFilter !== mapVersion ||
    onlyMine;

  function toggleMatch(matchId: number) {
    setSelected((current) =>
      current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId],
    );
  }

  function clearFilters() {
    setSearch("");
    setCollectionFilter("all");
    setResultFilter("all");
    setImportedWithinDays("all");
    setVersionFilter(mapVersion);
    setOnlyMine(false);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <BsSearch className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-600" />
          <input
            aria-label="Search replay library"
            className={formControlClass + " min-h-9 pl-8"}
            placeholder="Search replays"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Popup
          align="right"
          ariaLabel="Filter replays"
          trigger={<BsFunnel />}
          triggerClassName={`grid size-9 place-items-center rounded-sm border hover:border-white/20 hover:text-white ${
            versionFilter !== mapVersion ||
            resultFilter !== "all" ||
            importedWithinDays !== "all" ||
            onlyMine
              ? "border-cyan-400/40 bg-cyan-400/5 text-cyan-300"
              : "border-white/10 text-slate-500"
          }`}
          width="wide"
        >
          {() => (
            <div className="space-y-3 text-xs">
              <label className="block text-slate-500">
                Map
                <select
                  className={formControlClass + " mt-1"}
                  value={versionFilter}
                  onChange={(event) =>
                    setVersionFilter(
                      event.target.value === "all" ? "all" : Number(event.target.value),
                    )
                  }
                >
                  <option value="all">All maps</option>
                  {Object.entries(mapPatchLabels).map(([version, label]) => (
                    <option key={version} value={version}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-slate-500">
                Result
                <select
                  className={formControlClass + " mt-1"}
                  value={resultFilter}
                  onChange={(event) => setResultFilter(event.target.value as typeof resultFilter)}
                >
                  <option value="all">All results</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <label className="block text-slate-500">
                Imported
                <select
                  className={formControlClass + " mt-1"}
                  value={importedWithinDays}
                  onChange={(event) =>
                    setImportedWithinDays(
                      event.target.value === "all" ? "all" : Number(event.target.value),
                    )
                  }
                >
                  <option value="all">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </label>
              <label className="flex items-center gap-2 py-1 text-slate-400">
                <input
                  checked={onlyMine}
                  className="accent-cyan-400"
                  disabled={!library.profile.accountIds.length}
                  type="checkbox"
                  onChange={(event) => setOnlyMine(event.target.checked)}
                />
                My matches
              </label>
            </div>
          )}
        </Popup>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-2">
        <select
          aria-label="Collection"
          className={formControlClass + " min-h-9 min-w-0 flex-1"}
          value={collectionFilter}
          onChange={(event) => setCollectionFilter(event.target.value)}
        >
          <option value="all">All replays</option>
          <option value="unsorted">Unsorted</option>
          {library.collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <Popup
          align="right"
          ariaLabel="Manage collections"
          trigger={<BsThreeDots />}
          triggerClassName="grid size-9 place-items-center rounded-sm border border-white/10 text-slate-500 hover:border-white/20 hover:text-white"
          width="wide"
        >
          {({ close }) => (
            <div className="text-xs">
              {creatingCollection ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className={formControlClass + " min-h-9 min-w-0 flex-1"}
                    placeholder="Collection name"
                    value={collectionName}
                    onChange={(event) => setCollectionName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void createCollection();
                      }
                      if (event.key === "Escape") {
                        setCreatingCollection(false);
                        setCollectionName("");
                      }
                    }}
                  />
                  <button
                    className={primaryButtonClass}
                    disabled={!collectionName.trim()}
                    type="button"
                    onClick={() => void createCollection()}
                  >
                    Create
                  </button>
                </div>
              ) : (
                <button
                  className="flex w-full items-center gap-2 py-1.5 text-left text-cyan-300 hover:text-cyan-200"
                  type="button"
                  onClick={() => setCreatingCollection(true)}
                >
                  <BsPlus /> New collection
                </button>
              )}

              {activeCollection ? (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1">
                    <p className="mr-auto min-w-0 truncate text-slate-300">
                      {activeCollection.name}
                    </p>
                    <button
                      aria-label="Move collection up"
                      className="grid size-8 place-items-center text-slate-600 hover:text-white disabled:text-slate-700"
                      disabled={activeCollectionIndex === 0}
                      type="button"
                      onClick={() => void moveCollection(activeCollection.id, -1)}
                    >
                      <BsArrowUp />
                    </button>
                    <button
                      aria-label="Move collection down"
                      className="grid size-8 place-items-center text-slate-600 hover:text-white disabled:text-slate-700"
                      disabled={activeCollectionIndex === library.collections.length - 1}
                      type="button"
                      onClick={() => void moveCollection(activeCollection.id, 1)}
                    >
                      <BsArrowDown />
                    </button>
                  </div>
                  <textarea
                    aria-label="Collection notes"
                    className="mt-1 min-h-16 w-full resize-y rounded-sm border border-white/10 bg-slate-950 p-2 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-slate-500"
                    placeholder="Notes"
                    defaultValue={activeCollection.description}
                    key={activeCollection.id}
                    onBlur={(event) =>
                      void updateCollection(activeCollection.id, {
                        description: event.target.value.trim(),
                      })
                    }
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <button
                      className={primaryButtonClass}
                      type="button"
                      onClick={() => showMatches(activeCollection.matchIds)}
                    >
                      Show
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => void renameCollection(activeCollection)}
                    >
                      Rename
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => exportCollection(activeCollection)}
                    >
                      Export
                    </button>
                    <button
                      className={secondaryButtonClass}
                      type="button"
                      onClick={() => void duplicateCollection(activeCollection)}
                    >
                      Duplicate
                    </button>
                    <button
                      aria-label={"Delete " + activeCollection.name}
                      className="ml-auto grid size-8 place-items-center text-slate-600 hover:text-rose-300"
                      type="button"
                      onClick={() => {
                        void removeCollection(activeCollection);
                        close();
                      }}
                    >
                      <BsTrash />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Popup>
      </div>

      <div className="mt-2 flex min-h-6 items-center justify-between gap-3 text-[11px]">
        <span className="text-slate-500">
          {visibleMatches.length === library.matches.length && !filtersActive
            ? `${library.matches.length} ${library.matches.length === 1 ? "replay" : "replays"}`
            : `${visibleMatches.length} of ${library.matches.length} replays`}
        </span>
        {filtersActive ? (
          <button
            className="text-slate-500 hover:text-slate-200"
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {selected.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1 bg-cyan-400/5 px-2 py-1.5 text-xs">
          <span className="mr-1 text-slate-300">{selected.length} selected</span>
          <button
            className={primaryButtonClass}
            type="button"
            onClick={() => showMatches(selected)}
          >
            Show on map
          </button>
          <select
            aria-label="Bulk collection"
            className={formControlClass + " ml-auto min-h-8 w-auto min-w-32"}
            value={bulkCollectionId}
            onChange={(event) => {
              setBulkCollectionId(event.target.value);
              setCollectionStatus(null);
            }}
          >
            <option value="">Collection</option>
            {library.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          <button
            className={secondaryButtonClass}
            disabled={!bulkCollectionId || updatingCollection}
            type="button"
            onClick={() => void setMatchesInCollection(selected, bulkCollectionId, true)}
          >
            Add
          </button>
          <button
            className={secondaryButtonClass}
            disabled={!bulkCollectionId || updatingCollection}
            type="button"
            onClick={() => void setMatchesInCollection(selected, bulkCollectionId, false)}
          >
            Remove
          </button>
          {collectionStatus ? (
            <span
              aria-live="polite"
              className="order-last basis-full truncate pt-0.5 text-right text-[11px] text-slate-400"
            >
              {collectionStatus}
            </span>
          ) : null}
          <button
            aria-label="Delete selected matches"
            className="grid size-8 place-items-center text-slate-600 hover:text-rose-300"
            type="button"
            onClick={() => void removeMatches(selected)}
          >
            <BsTrash />
          </button>
        </div>
      ) : null}

      <div className="mt-2">
        <div className="grid min-h-8 grid-cols-[1rem_minmax(0,1fr)_minmax(6rem,1fr)_3.5rem_4rem] items-center gap-2 border-b border-white/10 px-1 text-[11px] text-slate-600 sm:grid-cols-[1rem_minmax(6rem,1fr)_7rem_6.5rem_4.25rem_3.25rem_2rem_4rem]">
          <input
            ref={selectAllInput}
            aria-label="Select all visible replays"
            checked={allVisibleSelected}
            className="accent-cyan-400"
            type="checkbox"
            onChange={() =>
              setSelected(
                allVisibleSelected
                  ? selected.filter((id) => !visibleMatches.some((match) => match.matchId === id))
                  : [...new Set([...selected, ...visibleMatches.map((match) => match.matchId)])],
              )
            }
          />
          <span>Replay</span>
          <span>Hero</span>
          <span className="hidden sm:block">Played</span>
          <span>Map</span>
          <span className="hidden sm:block">Result</span>
          <span className="hidden text-right sm:block">Wards</span>
          <span className="text-right">Actions</span>
        </div>

        {!visibleMatches.length ? (
          <p className="py-12 text-center text-sm text-slate-500">No matching replays</p>
        ) : (
          <div className="space-y-px">
            {visibleMatches.map((match) => {
              const me = playerFor(match, library.profile.accountIds);
              const won =
                me && match.radiantWon !== null ? me.isRadiant === match.radiantWon : null;
              const supported = match.mapVersion === mapVersion;
              const playerName = me ? (playerNames.get(me.id) ?? me.name) : null;

              return (
                <article
                  className={
                    "grid min-h-11 grid-cols-[1rem_minmax(0,1fr)_minmax(6rem,1fr)_3.5rem_4rem] items-center gap-2 rounded-sm px-1 text-xs transition sm:grid-cols-[1rem_minmax(6rem,1fr)_7rem_6.5rem_4.25rem_3.25rem_2rem_4rem] " +
                    (selected.includes(match.matchId)
                      ? "cursor-pointer bg-cyan-400/[0.07]"
                      : supported
                        ? "cursor-pointer hover:bg-white/[0.025]"
                        : "text-slate-600")
                  }
                  key={match.fileHash}
                  onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("button, input")) {
                      return;
                    }

                    toggleMatch(match.matchId);
                  }}
                >
                  <input
                    aria-label={"Select match " + match.matchId}
                    checked={selected.includes(match.matchId)}
                    className="accent-cyan-400"
                    type="checkbox"
                    onChange={() => toggleMatch(match.matchId)}
                  />
                  <span className="truncate text-slate-200">
                    {me && playerName ? playerName : match.fileName}
                  </span>
                  {me?.hero ? (
                    <HeroName className="text-slate-300" value={me.hero} />
                  ) : (
                    <span className="truncate text-slate-600">Unknown</span>
                  )}
                  <span className="hidden truncate text-slate-500 sm:block">
                    {matchDate(match)}, {duration(match.duration)}
                  </span>
                  <span className={supported ? "text-slate-500" : "text-amber-300"}>
                    {mapPatchLabel(match.mapVersion).replace(/ map$/i, "")}
                  </span>
                  <span
                    className={
                      "hidden sm:block " +
                      (won === null ? "text-slate-600" : won ? "text-emerald-300" : "text-rose-300")
                    }
                  >
                    {won === null ? "Unknown" : won ? "Won" : "Lost"}
                  </span>
                  <span className="hidden text-right text-slate-400 sm:block">
                    {match.wards.length}
                  </span>
                  <div className="ml-auto flex items-center">
                    {supported ? (
                      <button
                        aria-label={"Show match " + match.matchId + " on map"}
                        className="grid size-8 place-items-center rounded-sm text-cyan-300 hover:bg-white/5 hover:text-cyan-200"
                        title="Show on map"
                        type="button"
                        onClick={() => showMatches([match.matchId])}
                      >
                        <BsMap />
                      </button>
                    ) : null}
                    <button
                      aria-label={"Delete match " + match.matchId}
                      className="grid size-8 place-items-center rounded-sm text-slate-700 hover:bg-white/5 hover:text-rose-300"
                      title="Delete replay"
                      type="button"
                      onClick={() => void removeMatches([match.matchId])}
                    >
                      <BsTrash />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
