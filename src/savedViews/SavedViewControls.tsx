import { useState } from "react";
import { BsCheck2, BsLink45Deg, BsPencil, BsTrash } from "react-icons/bs";
import { fieldControlClass } from "../components/ui";
import type { StoredAnalysis } from "../indexedDb";
import type { ViewState } from "./viewState";

type SavedView = StoredAnalysis<ViewState>;

interface SavedViewControlsProps {
  activeView: SavedView | null;
  deletedView: SavedView | null;
  disabled: boolean;
  modified: boolean;
  remove: (view: SavedView) => Promise<void>;
  rename: (view: SavedView, name: string) => Promise<boolean>;
  resetCurrentView: () => Promise<void>;
  restore: (key: string) => void;
  revert: () => void;
  save: (name: string) => Promise<boolean>;
  share: (view: SavedView) => Promise<void>;
  undoRemove: () => Promise<void>;
  update: () => Promise<boolean>;
  views: SavedView[];
}

export default function SavedViewControls({
  activeView,
  deletedView,
  disabled,
  modified,
  remove,
  rename,
  resetCurrentView,
  restore,
  revert,
  save,
  share,
  undoRemove,
  update,
  views,
}: SavedViewControlsProps) {
  const [creating, setCreating] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  function openView(view: SavedView) {
    restore(view.key);
  }

  function deleteView(view: SavedView) {
    void remove(view);
  }

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-slate-300">Saved views</p>
        <button
          className="py-1 text-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-600"
          disabled={disabled}
          type="button"
          onClick={() => setCreating(true)}
        >
          Save new
        </button>
      </div>

      {creating ? (
        <SaveViewForm
          initialName={activeView ? `${activeView.name} copy` : "Ward analysis"}
          save={save}
          close={() => setCreating(false)}
        />
      ) : null}

      {views.length > 0 ? (
        <div className="mt-2 border-t border-white/10">
          <div className="max-h-72 overflow-y-auto">
            {views.map((view) =>
              editingKey === view.key ? (
                <RenameViewForm
                  key={view.key}
                  view={view}
                  close={() => setEditingKey(null)}
                  rename={rename}
                />
              ) : (
                <div
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center border-b border-white/5 last:border-0 ${
                    view.key === activeView?.key ? "bg-cyan-500/5" : ""
                  }`}
                  key={view.key}
                >
                  <button
                    className="flex min-w-0 items-center gap-2 py-2 text-left text-slate-300 hover:text-white"
                    type="button"
                    onClick={() => openView(view)}
                  >
                    <span className="w-3 shrink-0 text-cyan-400">
                      {view.key === activeView?.key ? <BsCheck2 /> : null}
                    </span>
                    <span className="truncate">{view.name}</span>
                  </button>
                  <ShareViewButton share={() => share(view)} />
                  <button
                    aria-label={`Rename ${view.name}`}
                    className="p-2 text-sm text-slate-600 hover:text-white"
                    title="Rename"
                    type="button"
                    onClick={() => setEditingKey(view.key)}
                  >
                    <BsPencil />
                  </button>
                  <button
                    aria-label={`Delete ${view.name}`}
                    className="p-2 pr-0 text-sm text-slate-600 hover:text-rose-300"
                    title="Delete"
                    type="button"
                    onClick={() => deleteView(view)}
                  >
                    <BsTrash />
                  </button>
                  {view.key === activeView?.key && modified ? (
                    <div className="col-span-full flex items-center gap-3 pb-2 pl-5 text-slate-500">
                      <span className="min-w-0 flex-1">Changed since saved</span>
                      <button
                        className="shrink-0 text-cyan-300 hover:text-cyan-200 disabled:text-slate-600"
                        disabled={disabled || pending}
                        type="button"
                        onClick={() => {
                          setPending(true);
                          void update().finally(() => setPending(false));
                        }}
                      >
                        {pending ? "Saving…" : "Update"}
                      </button>
                      <button
                        className="shrink-0 text-slate-400 hover:text-slate-200 disabled:text-slate-700"
                        disabled={pending}
                        type="button"
                        onClick={revert}
                      >
                        Restore
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </div>
      ) : creating ? null : (
        <p className="border-t border-white/10 py-5 text-center text-slate-600">
          No saved views yet
        </p>
      )}

      {deletedView ? (
        <div className="mt-2 flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-2">
          <p className="truncate text-slate-500">Deleted {deletedView.name}</p>
          <button
            className="shrink-0 py-1 text-cyan-300 hover:text-cyan-200"
            type="button"
            onClick={() => void undoRemove()}
          >
            Undo
          </button>
        </div>
      ) : null}

      <div className="mt-2 border-t border-white/10 pt-2">
        {confirmingReset ? (
          <div>
            <p className="leading-5 text-slate-500">
              Reset filters, grouping, map state, and location changes? Saved views will remain
              available.
            </p>
            <div className="mt-1 flex justify-end gap-3">
              <button
                className="py-1 text-slate-500 hover:text-white disabled:text-slate-700"
                disabled={resetting}
                type="button"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </button>
              <button
                className="py-1 text-rose-300 hover:text-rose-200 disabled:cursor-wait disabled:text-slate-600"
                disabled={resetting}
                type="button"
                onClick={() => {
                  setResetting(true);
                  void resetCurrentView().finally(() => {
                    setResetting(false);
                    setConfirmingReset(false);
                  });
                }}
              >
                {resetting ? "Resetting…" : "Reset"}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="py-1 text-slate-500 hover:text-rose-300"
            type="button"
            onClick={() => setConfirmingReset(true)}
          >
            Reset current view
          </button>
        )}
      </div>
    </div>
  );
}

function RenameViewForm({
  close,
  rename,
  view,
}: {
  close: () => void;
  rename: (view: SavedView, name: string) => Promise<boolean>;
  view: SavedView;
}) {
  const [name, setName] = useState(view.name);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="border-b border-white/5 py-1.5"
      onSubmit={(event) => {
        event.preventDefault();

        if (!name.trim()) {
          return;
        }

        setPending(true);
        void rename(view, name).then((renamed) => {
          setPending(false);

          if (renamed) {
            close();
          }
        });
      }}
    >
      <input
        aria-label={`Rename ${view.name}`}
        autoFocus
        className={`${fieldControlClass} px-2 py-1.5 text-xs`}
        disabled={pending}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
          }
        }}
      />
      <div className="mt-1 flex justify-end gap-3">
        <button
          className="py-1 text-slate-500 hover:text-white"
          disabled={pending}
          type="button"
          onClick={close}
        >
          Cancel
        </button>
        <button
          className="py-1 text-cyan-300 hover:text-cyan-200 disabled:text-slate-600"
          disabled={pending || !name.trim()}
          type="submit"
        >
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
    </form>
  );
}

function ShareViewButton({ share }: { share: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label="Copy share link"
      className={`p-2 text-sm ${copied ? "text-cyan-300" : "text-slate-600 hover:text-white"}`}
      title={copied ? "Link copied" : "Copy share link"}
      type="button"
      onClick={() => {
        void share().then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? <BsCheck2 /> : <BsLink45Deg />}
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
