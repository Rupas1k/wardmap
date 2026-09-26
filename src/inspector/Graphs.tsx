import PlacementChart, { timelineLabels } from "../dataset/PlacementChart";
import { useMapStore } from "../state/mapState";
import { useSelectedCluster } from "../state/mapSelectors";
import { InspectorSection } from "./InspectorPrimitives";

export default function LocationActivity() {
  const selectedCluster = useSelectedCluster();
  const side = useMapStore((state) => state.currentSide);
  const sideData = selectedCluster?.[side] ?? null;

  return (
    <InspectorSection separated title="Activity by game minute">
      <div className="h-52">
        <PlacementChart
          labels={timelineLabels}
          placements={sideData?.graphs.wards.placed ?? []}
          removals={sideData?.graphs.wards.destroyed ?? []}
        />
      </div>
    </InspectorSection>
  );
}
