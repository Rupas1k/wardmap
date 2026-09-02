import { useMapStore } from "../state/mapState";
import { useSelectedCluster } from "../state/mapSelectors";
import { InspectorSection } from "./InspectorPrimitives";
import LineChart, { timelineLabels } from "./LineChart";

export default function LocationActivity() {
  const selectedCluster = useSelectedCluster();
  const side = useMapStore((state) => state.currentSide);
  const sideData = selectedCluster?.[side] ?? null;

  return (
    <InspectorSection separated title="Activity by game minute">
      <div className="flex items-center justify-end gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-amber-300" />
          Placed
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-rose-400" />
          Dewarded
        </span>
      </div>
      <div className="mt-3 h-52">
        <LineChart
          datasets={[
            {
              data: sideData?.graphs.wards.placed ?? [],
              label: "Placed",
              borderColor: "#FFFF66",
              backgroundColor: "#FFFF66",
            },
            {
              data: sideData?.graphs.wards.destroyed ?? [],
              label: "Dewarded",
              borderColor: "#ff6666",
              backgroundColor: "#ff6666",
            },
          ]}
          labels={timelineLabels}
        />
      </div>
    </InspectorSection>
  );
}
