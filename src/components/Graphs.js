import {observer} from "mobx-react";
import {useStores} from "../stores/rootStore";
import LineChart, {labels} from "./charts/LineChart";
import React from "react";


const Graphs = observer(() => {
    const {mapStore} = useStores()
    const clusterData = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null
    const page = mapStore.sides[mapStore.currentSide]

    return (
        <div className="graphs">
            <div className="graph">
                <div className="graph-header">
                    <span className="graph-name">Placed&Destroyed by minute</span>
                </div>
                <div className="graph-content">
                    <LineChart
                        datasets={[{
                            data: clusterData && clusterData[page] ? clusterData[page].graphs.wards.placed : {},
                            label: "Placed",
                            borderColor: '#FFFF66',
                            backgroundColor: '#FFFF66',
                            // yAxisID: 'y',
                        }, {
                            data: clusterData && clusterData[page] ? clusterData[page].graphs.wards.destroyed : {},
                            label: "Destroyed",
                            borderColor: '#ff6666',
                            backgroundColor: '#ff6666',
                            // yAxisID: 'y',
                        }]}
                        labels={labels.timeline}
                        title={"Placed&Destroyed by minute"}
                    />
                </div>
            </div>
        </div>
    )
})


export default Graphs