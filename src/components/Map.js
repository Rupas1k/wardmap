import React, {useEffect} from "react";
import {observer} from "mobx-react"

import {useStores} from "../stores/rootStore";
import {createMap, vectorLayer, vectorSource} from "../map/OLMap";
import {click} from "../map/events";


export default class MapComponent extends React.Component {

    MapView = observer(() => {
        const {mapStore} = useStores()

        useEffect(() => {
            mapStore.setMap(createMap(), vectorLayer, vectorSource)
            mapStore.map.addEventListener("click", e => click(e, mapStore))

            return () => {
                mapStore.map.setTarget(null)
                mapStore.map.removeEventListener("click", e => click(e, mapStore))
            }
        })

        return (
            <div className="map-wrap">
                <div id="map"></div>
            </div>
        )
    })

    render() {
        const {MapView} = this
        return (
            <div>
                <MapView/>
            </div>
        );
    }
}
