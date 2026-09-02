import { useState } from "react";
import { BsKey, BsX } from "react-icons/bs";
import { getApiKey, saveApiKey, verifyApiKey } from "../auth";
import Popup from "./Popup";
import { formControlClass } from "./ui";

export default function AccessKey() {
  const [key, setKey] = useState(getApiKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const apply = async () => {
    const candidate = key.trim();

    if (!candidate) {
      saveApiKey("");
      window.location.reload();

      return;
    }
    setError(null);
    setPending(true);
    try {
      await verifyApiKey(candidate);
      saveApiKey(candidate);
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to verify the API key");
    } finally {
      setPending(false);
    }
  };

  const clear = () => {
    saveApiKey("");
    setKey("");
    window.location.reload();
  };

  return (
    <Popup
      align="right"
      trigger={
        <>
          <BsKey className={key ? "text-emerald-400" : "text-slate-500"} />
          <span className="hidden sm:inline">Access</span>
        </>
      }
      triggerClassName="flex items-center gap-1.5 px-1 py-1.5 text-xs text-slate-400 hover:text-slate-200"
    >
      {() => (
        <>
          <label
            className="block text-xs font-semibold tracking-wide text-slate-400 uppercase"
            htmlFor="api-key"
          >
            API key
          </label>
          <div className="mt-2 flex gap-2">
            <input
              autoComplete="off"
              className={`${formControlClass} min-w-0 flex-1 px-3 py-2 text-sm placeholder:text-slate-600`}
              id="api-key"
              onChange={(event) => setKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void apply();
                }
              }}
              placeholder="wm_…"
              type="password"
              value={key}
            />
            {key && (
              <button
                aria-label="Remove API key"
                className="grid size-10 shrink-0 place-items-center rounded-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                onClick={clear}
                type="button"
              >
                <BsX className="text-xl" />
              </button>
            )}
          </div>
          <button
            className="mt-3 w-full rounded-sm bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:cursor-wait disabled:opacity-50"
            disabled={pending}
            onClick={() => void apply()}
            type="button"
          >
            {pending ? "Checking…" : "Apply key"}
          </button>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </>
      )}
    </Popup>
  );
}
