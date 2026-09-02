import { useEffect } from "react";
import { fetchPlayers } from "../api/fetchPlayers";
import { fetchTeams } from "../api/fetchTeams";
import { useWorkspaceStore } from "../state/workspaceState";

export default function useDatasetMetadata() {
  const leagueIds = useWorkspaceStore((state) => state.draftDataset.leagueIds);
  const teamIds = useWorkspaceStore((state) => state.draftDataset.teamIds);
  const opponentTeamIds = useWorkspaceStore((state) => state.draftDataset.opponentTeamIds);
  const setMetadata = useWorkspaceStore((state) => state.setMetadata);
  const setError = useWorkspaceStore((state) => state.setError);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    if (leagueIds.length === 0) {
      setMetadata([], [], []);

      return;
    }

    void Promise.all([
      fetchTeams(leagueIds, controller.signal),
      fetchPlayers(leagueIds, teamIds, "placer", controller.signal),
      fetchPlayers(leagueIds, opponentTeamIds, "participant", controller.signal),
    ])
      .then(([teams, players, opponentPlayers]) => {
        if (active) {
          setMetadata(teams, players, opponentPlayers);
        }
      })
      .catch((reason: unknown) => {
        if (active && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load metadata");
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [leagueIds, opponentTeamIds, setError, setMetadata, teamIds]);
}
