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

const textColor = (destroyed, amount) => {
    try {
        const destroyedRatio = destroyed / amount

        const red = (destroyedRatio + 0.2) * 256
        const green = 256 - (destroyedRatio + 0.2) * 256
        const blue = 0

        return `rgba(${red}, ${green}, ${blue}, 1)`;
    } catch (e) {
        return 'rgba(0, 0, 255, 1)';
    }
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
        name: "% Full Lifetime",
        data: clusterData && clusterData[page] ? <span style={{color: textColor(clusterData[page].destroyed, clusterData[page].amount)}}>{((1 - clusterData[page].destroyed / clusterData[page].amount) * 100).toFixed(2)}%</span> : "--"
    }, {
        name: "Average Lifetime",
        data: clusterData && clusterData[page] ? timeFormat(clusterData[page].duration) : "--",
        delta: clusterData && clusterData[page] ? (
            <span style={{color: clusterData[page].duration >= average[page].duration ? 'green' : 'red'}}>
                        {`${clusterData[page].duration >= average[page].duration ? '+' : '-'}${timeFormat(Math.abs(clusterData[page].duration - average[page].duration))}`}
                    </span>
        ) : ""
    }, {
        name: "Average Time Placed",
        data: clusterData && clusterData[page] ? timeFormat(clusterData[page].time_placed) : "--"
    }, {
        name: "Average Gold Advantage",
        data: clusterData && clusterData[page] && clusterData[page].advantage ?
            <span className={clusterData[page].advantage >= 0 ? "green" : "red"}>
                        {clusterData[page].advantage || "--"}
                    </span>
            : "--"
    }]

    return (
        <>
            {colsData.map((data, index) => <ClusterCol name={data.name} key={index} data={data.data} delta={data.delta} />)}
        </>
    )
})


export default Records