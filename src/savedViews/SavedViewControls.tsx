import { useState } from "react";
import { fieldControlClass } from "../components/ui";
import type { StoredAnalysis } from "../indexedDb";
import type { ViewState } from "./viewState";

type SavedView = StoredAnalysis<ViewState>;

interface SavedViewControlsProps {
  activeView: SavedView | null;
  disabled: boolean;
  modified: boolean;
  remove: (view: SavedView) => Promise<void>;
  rename: (view: SavedView) => Promise<void>;
  restore: (key: string) => void;
  revert: () => void;
  save: (name: string) => Promise<boolean>;
  share: (view: SavedView) => Promise<void>;
  update: () => Promise<boolean>;
  views: SavedView[];
}

export default function SavedViewControls({
  activeView,
  disabled,
  modified,
  remove,
  rename,
  restore,
  revert,
  save,
  share,
  update,
  views,
}: SavedViewControlsProps) {
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="text-xs">
      {activeView ? (
        <>
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <p className="truncate text-slate-300">{activeView.name}</p>
            {modified ? <span className="shrink-0 text-amber-300">Modified</span> : null}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <button
              className="py-1 text-cyan-300 hover:text-cyan-200 disabled:cursor-default disabled:text-slate-600"
              disabled={disabled || pending || !modified}
              type="button"
              onClick={() => {
                setPending(true);
                void update().finally(() => setPending(false));
              }}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              className="py-1 text-slate-500 hover:text-slate-300 disabled:cursor-default disabled:text-slate-700"
              disabled={pending || !modified}
              type="button"
              onClick={revert}
            >
              Revert
            </button>
            <button
              className="py-1 text-slate-500 hover:text-slate-300"
              type="button"
              onClick={() => setCreating(true)}
            >
              Save as
            </button>
          </div>
        </>
      ) : (
        <button
          className="py-1 text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
          disabled={disabled}
          type="button"
          onClick={() => setCreating(true)}
        >
          Save current view
        </button>
      )}

      {creating ? (
        <SaveViewForm
          initialName={activeView ? `${activeView.name} copy` : "Ward analysis"}
          save={save}
          close={() => setCreating(false)}
        />
      ) : null}

      {views.length > 0 ? (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="mb-1 text-slate-600">Saved views</p>
          <div className="max-h-40 overflow-y-auto">
            {views.map((view) => (
              <div
                className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center border-b border-white/5 last:border-0 ${
                  view.key === activeView?.key ? "bg-cyan-500/5" : ""
                }`}
                key={view.key}
              >
                <button
                  className="truncate py-2 text-left text-slate-300 hover:text-white"
                  type="button"
                  onClick={() => restore(view.key)}
                >
                  {view.name}
                </button>
                <ShareViewButton share={() => share(view)} />
                <button
                  className="px-2 text-slate-500 hover:text-white"
                  type="button"
                  onClick={() => void rename(view)}
                >
                  Rename
                </button>
                <button
                  aria-label={`Delete ${view.name}`}
                  className="pl-2 text-sm text-slate-600 hover:text-rose-300"
                  type="button"
                  onClick={() => void remove(view)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShareViewButton({ share }: { share: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="px-2 text-slate-500 hover:text-white"
      type="button"
      onClick={() => {
        void share().then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function SaveViewForm({
  close,
  initialName,
  save,
}: {
  close: () => void;
  initialName: string;
  save: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-2 border-t border-white/10 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        const nextName = name.trim();

        if (!nextName) {
          return;
        }

        setPending(true);
        void save(nextName).then((saved) => {
          setPending(false);

          if (saved) {
            close();
          }
        });
      }}
    >
      <label className="text-slate-500">
        Name
        <input
          autoFocus
          className={`${fieldControlClass} px-2 py-1.5 text-xs`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="mt-2 flex justify-end gap-3">
        <button className="py-1 text-slate-500 hover:text-white" type="button" onClick={close}>
          Cancel
        </button>
        <button
          className="py-1 font-medium text-cyan-300 hover:text-cyan-200 disabled:cursor-wait disabled:text-slate-600"
          disabled={pending || !name.trim()}
          type="submit"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
