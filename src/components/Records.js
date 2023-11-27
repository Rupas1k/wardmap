import {observer} from "mobx-react";
import {useStores} from "../stores/rootStore";
import ClusterCol from "./ClusterCol";
import React from "react";


const timeFormat = seconds => {
    const absSeconds = Math.abs(seconds)
    const minutes = Math.floor(absSeconds / 60)
    const secondsRemainder = absSeconds % 60
    const sign = seconds < 0 ? '-' : ''

    return `${sign}${String(minutes).padStart(2, "0")}:${String(secondsRemainder).padStart(2, "0")}`
}


const Records = observer(() => {
    const {mapStore} = useStores()
    const clusterData = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null
    const average = mapStore.averageValues
    const page = mapStore.sides[mapStore.currentSide]

    const colsData = [{
        name: "Amount",
        data: clusterData && clusterData[page] ? clusterData[page].amount : "--"
    }, {
        name: "Destroyed",
        data: clusterData && clusterData[page] ? clusterData[page].destroyed : "--"
    }, {
        name: "% Survived",
        data: clusterData && clusterData[page] ? `${((1 - clusterData[page].destroyed / clusterData[page].amount) * 100).toFixed(2)}%` : "--"
    }, {
        name: "Duration",
        data: clusterData && clusterData[page] ? timeFormat(clusterData[page].duration) : "--",
        delta: clusterData && clusterData[page] ? (
            <span style={{color: clusterData[page].duration >= average[page].duration ? 'green' : 'red'}}>
                        {`${clusterData[page].duration >= average[page].duration ? '+' : '-'}${timeFormat(Math.abs(clusterData[page].duration - average[page].duration))}`}
                    </span>
        ) : ""
    }, {
        name: "Time Placed",
        data: clusterData && clusterData[page] ? timeFormat(clusterData[page].time_placed) : "--"
    }, {
        name: "Gold Advantage",
        data: clusterData && clusterData[page] && clusterData[page].advantage ?
            <span className={clusterData[page].advantage >= 0 ? "green" : "red"}>
                        {clusterData[page].advantage || "--"}
                    </span>
            : "--"
    }]

    return (
        <>
            {colsData.map(data => <ClusterCol name={data.name} data={data.data} delta={data.delta} />)}
        </>
    )
})


export default Records