import { useEffect, useMemo, useRef } from "react";
import type { ClusteringSettings } from "../state/mapState";
import { useWorkspaceStore } from "../state/workspaceState";
import type { Ward } from "../types";
import clusterWards from "./clusterWards";

export default function useLocationClustering({
  clusteringEnabled,
  clusteringSettings,
  groupByGridCell,
  wards,
}: {
  clusteringEnabled: boolean;
  clusteringSettings: ClusteringSettings;
  groupByGridCell: boolean;
  wards: Ward[];
}) {
  const origin = useWorkspaceStore((state) => state.analysisContext.origin);
  const setContextClusterSets = useWorkspaceStore((state) => state.setContextClusterSets);
  const setContextStatus = useWorkspaceStore((state) => state.setContextStatus);
  const setError = useWorkspaceStore((state) => state.setError);
  const request = useRef(0);
  const contextWards = useMemo(() => {
    if (!origin) {
      return null;
    }

    return wards.filter((ward) =>
      origin.kind === "player" ? ward.player_placed_id === origin.id : ward.match_id === origin.id,
    );
  }, [origin, wards]);

  useEffect(() => {
    const currentRequest = ++request.current;

    if (!contextWards) {
      setContextClusterSets(null);
      setContextStatus("idle");

      return;
    }

    const controller = new AbortController();

    setContextClusterSets(null);
    setContextStatus("clustering");

    void clusterWards(
      contextWards,
      clusteringSettings,
      clusteringEnabled,
      groupByGridCell,
      controller.signal,
    )
      .then((clusterSets) => {
        if (currentRequest === request.current && !controller.signal.aborted) {
          setContextClusterSets(clusterSets);
          setContextStatus("ready");
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted && currentRequest === request.current) {
          setError(reason instanceof Error ? reason.message : "Unable to cluster selected wards");
          setContextStatus("error");
        }
      });

    return () => controller.abort();
  }, [
    clusteringEnabled,
    clusteringSettings,
    contextWards,
    groupByGridCell,
    setContextClusterSets,
    setContextStatus,
    setError,
  ]);
}
