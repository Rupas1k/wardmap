import { useEffect, useState } from "react";
import { fetchLeagues } from "./api/fetchLeagues";
import Workspace from "./workspace/Workspace";
import { useWorkspaceStore } from "./state/workspaceState";

export default function App() {
  const setLeagues = useWorkspaceStore((state) => state.setLeagues);
  const [leagueError, setLeagueError] = useState<string | null>(null);
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
            setLeagueError(null);
          }
        })
        .catch((reason: unknown) => {
          if (active && !requestController.signal.aborted) {
            setLeagueError(reason instanceof Error ? reason.message : "Unable to load leagues");
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

  return (
    <Workspace
      leagueError={leagueError}
      retryLeagues={() => {
        setLeagueError(null);
        setLoadAttempt((attempt) => attempt + 1);
      }}
    />
  );
}
