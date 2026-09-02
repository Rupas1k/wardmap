import { useEffect, useRef, useState } from "react";
import type { SharedView } from "./sharedView";
import { sharedViewFromHash } from "./sharedView";

function clearSharedHash() {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

export default function SharedViewPrompt({
  apply,
}: {
  apply: (view: SharedView) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState(() => sharedViewFromHash());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (view && !dialog.current?.open) {
      dialog.current?.showModal();
    }
  }, [view]);

  if (!view) {
    return null;
  }

  function close() {
    dialog.current?.close();
    clearSharedHash();
    setView(null);
  }

  return (
    <dialog
      className="m-auto w-[min(25rem,calc(100vw-2rem))] rounded-sm border border-white/10 bg-slate-900 p-4 text-slate-200 shadow-xl backdrop:bg-black/70"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <h2 className="text-sm font-semibold">Open shared view?</h2>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        This will load {view.settings.dataset.leagueIds.length.toLocaleString()} selected{" "}
        {view.settings.dataset.leagueIds.length === 1 ? "league" : "leagues"} and apply the shared
        filters and grouping settings.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-slate-600">Leagues</dt>
        <dd className="truncate text-right font-mono text-slate-300">
          {view.settings.dataset.leagueIds.join(", ")}
        </dd>
        <dt className="text-slate-600">Grouping</dt>
        <dd className="text-right text-slate-300">
          {view.settings.clusteringEnabled === false
            ? view.settings.groupByGridCell
              ? "GridNav cells"
              : "Individual wards"
            : view.settings.clustering.algorithm.toUpperCase()}
        </dd>
        <dt className="text-slate-600">Side</dt>
        <dd className="text-right capitalize text-slate-300">{view.map.side}</dd>
      </dl>
      <div className="mt-4 flex justify-end gap-3">
        <button
          className="px-1 py-1.5 text-xs text-slate-500 hover:text-white"
          disabled={pending}
          type="button"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className="rounded-sm bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-wait disabled:opacity-50"
          disabled={pending}
          type="button"
          onClick={() => {
            setPending(true);
            void apply(view)
              .then(close)
              .finally(() => setPending(false));
          }}
        >
          {pending ? "Loading…" : "Open shared view"}
        </button>
      </div>
    </dialog>
  );
}
