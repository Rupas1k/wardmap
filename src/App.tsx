import { useEffect, useState } from "react";
import { fetchLeagues } from "./api/fetchLeagues";
import Workspace from "./workspace/Workspace";
import { useWorkspaceStore } from "./state/workspaceState";

export default function App() {
  const leagues = useWorkspaceStore((state) => state.leagues);
  const setLeagues = useWorkspaceStore((state) => state.setLeagues);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    function refreshLeagues() {
      controller?.abort();

      const requestController = new AbortController();
      controller = requestController;

      void fetchLeagues(requestController.signal)
        .then((result) => {
          if (active) {
            setLeagues(result);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if (active && !requestController.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "Unable to load leagues");
          }
        });
    }

    refreshLeagues();
    const interval = window.setInterval(refreshLeagues, 60_000);
    window.addEventListener("focus", refreshLeagues);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshLeagues);
    };
  }, [loadAttempt, setLeagues]);

  if (leagues.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-sm text-slate-400">
        {error ? (
          <div className="max-w-md text-center">
            <p className="text-rose-300">{error}</p>
            <button
              className="mt-4 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-white"
              type="button"
              onClick={() => {
                setError(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          "Loading leagues…"
        )}
      </div>
    );
  }

  return <Workspace />;
}
