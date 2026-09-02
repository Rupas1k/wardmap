import { useEffect, useRef, useState } from "react";
import { BsChevronRight } from "react-icons/bs";
import { fieldControlClass } from "../components/ui";

export interface SelectionOption {
  id: number;
  name: string;
  meta?: string | undefined;
}

export function SelectionDialog({
  allowSelectAll = false,
  disabled = false,
  label,
  options,
  searchPlaceholder,
  selectedIds,
  setSelectedIds,
  summary,
}: {
  allowSelectAll?: boolean;
  disabled?: boolean;
  label: string;
  options: SelectionOption[];
  searchPlaceholder: string;
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  summary: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const selected = new Set(selectedIds);
  const visibleOptions = options
    .filter((option) =>
      `${option.name} ${option.meta ?? ""}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((left, right) => Number(selected.has(right.id)) - Number(selected.has(left.id)));

  return (
    <>
      <button
        className="grid w-full grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-2 py-2.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        <span className="text-slate-500">{label}</span>
        <span className="min-w-0 break-words text-right text-slate-200">{summary}</span>
        <BsChevronRight className="text-slate-600" />
      </button>

      <dialog
        className="m-auto w-[min(25rem,calc(100vw-2rem))] rounded-sm border border-white/10 bg-slate-900 p-0 text-slate-200 shadow-xl backdrop:bg-black/70"
        ref={dialog}
        onClose={() => setSearch("")}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialog.current?.close();
          }
        }}
      >
        <div className="flex items-center px-3 pt-3">
          <h3 className="text-sm font-medium text-slate-200">{label}</h3>
          <div className="ml-auto flex items-center gap-3">
            {allowSelectAll && selectedIds.length < options.length ? (
              <button
                className="text-xs text-slate-500 hover:text-white"
                type="button"
                onClick={() => setSelectedIds(options.map((option) => option.id))}
              >
                Select all
              </button>
            ) : null}

            {selectedIds.length > 0 ? (
              <button
                className="text-xs text-slate-500 hover:text-white"
                type="button"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </button>
            ) : null}

            <button
              aria-label={`Close ${label}`}
              className="text-lg leading-none text-slate-500 hover:text-white"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-3 pt-2">
          <input
            autoFocus
            className="w-full rounded-sm border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder={searchPlaceholder}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="mt-1 max-h-[55vh] overflow-y-auto">
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const optionSelected = selected.has(option.id);

                return (
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-1 py-2 text-sm ${
                      optionSelected ? "text-slate-100" : "text-slate-400 hover:text-white"
                    }`}
                    key={option.id}
                  >
                    <input
                      checked={optionSelected}
                      className="accent-cyan-400"
                      type="checkbox"
                      onChange={() =>
                        setSelectedIds(
                          optionSelected
                            ? selectedIds.filter((id) => id !== option.id)
                            : [...selectedIds, option.id].sort((left, right) => left - right),
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 break-words">{option.name}</span>
                    {option.meta ? (
                      <span className="text-xs text-slate-600">{option.meta}</span>
                    ) : null}
                  </label>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No matching options</p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-slate-500">
      {label}
      {children}
    </label>
  );
}

function formatGameTime(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const sign = totalSeconds < 0 ? "-" : "";
  const absolute = Math.abs(totalSeconds);

  return `${sign}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, "0")}`;
}

function parseGameTime(value: string): number | null {
  const match = /^(-)?(\d+)(?::([0-5]?\d))?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const seconds = Number(match[2]) * 60 + Number(match[3] ?? 0);

  return (match[1] ? -seconds : seconds) / 60;
}

function GameTimeInput({
  label,
  minutes,
  minimumMinutes,
  setMinutes,
}: {
  label: string;
  minutes: number;
  minimumMinutes?: number;
  setMinutes: (minutes: number) => void;
}) {
  const [value, setValue] = useState(() => formatGameTime(minutes));

  useEffect(() => setValue(formatGameTime(minutes)), [minutes]);

  const commit = () => {
    const parsed = parseGameTime(value);
    const next = parsed === null ? minutes : Math.max(minimumMinutes ?? -Infinity, parsed);
    setMinutes(next);
    setValue(formatGameTime(next));
  };

  return (
    <input
      aria-label={label}
      className={fieldControlClass}
      inputMode="numeric"
      value={value}
      onBlur={commit}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function GameTimeRange({
  label,
  minimumMinutes,
  maximumMinutes,
  setMinimumMinutes,
  setMaximumMinutes,
}: {
  label: string;
  minimumMinutes: number;
  maximumMinutes: number;
  setMinimumMinutes: (value: number) => void;
  setMaximumMinutes: (value: number) => void;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-[11px] text-slate-500">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <GameTimeInput
          label={`${label} minimum`}
          minutes={minimumMinutes}
          minimumMinutes={-1.5}
          setMinutes={setMinimumMinutes}
        />
        <GameTimeInput
          label={`${label} maximum`}
          minutes={maximumMinutes}
          setMinutes={setMaximumMinutes}
        />
      </div>
    </fieldset>
  );
}

export function Range({
  label,
  min,
  max,
  minimumAllowed,
  scale = 1,
  setMin,
  setMax,
}: {
  label: string;
  min: number;
  max: number;
  minimumAllowed?: number;
  scale?: number;
  setMin: (value: number) => void;
  setMax: (value: number) => void;
}) {
  return (
    <fieldset className="mt-3">
      <legend className="text-[11px] text-slate-500">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label={`${label} minimum`}
          className={fieldControlClass}
          min={minimumAllowed === undefined ? undefined : minimumAllowed * scale}
          type="number"
          value={min * scale}
          onChange={(event) =>
            setMin(
              minimumAllowed === undefined
                ? Number(event.target.value) / scale
                : Math.max(minimumAllowed, Number(event.target.value) / scale),
            )
          }
        />
        <input
          aria-label={`${label} maximum`}
          className={fieldControlClass}
          type="number"
          value={max * scale}
          onChange={(event) => setMax(Number(event.target.value) / scale)}
        />
      </div>
    </fieldset>
  );
}
