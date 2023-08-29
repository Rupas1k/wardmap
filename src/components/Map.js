import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/mainStore";
import mapStore from "../stores/local/mapStore";
import TileLayer from "ol/layer/Tile";
import {OSM} from "ol/source";
import {View, Map} from "ol";
import MapStore from "../stores/local/mapStore";

export default class MapComponent extends React.Component {

    MapView = observer(() => {
        useEffect(() => {
            const map = new Map({
                layers: [
                    new TileLayer({
                        source: new OSM(),
                    }),
                ],
                target: 'map',
                view: new View({
                    center: [0, 0],
                    zoom: 0,
                }),
            });
            mapStore.setMap(map)
            console.log("map")
            return () => MapStore.map.setTarget(null)
        }, [])

        return (
            <div id="map"></div>
        )
    })

    render() {
        const {MapView} = this
        return (
            <div>
                <MapView/>
                <button onClick={mapStore.zoomIn}>zoomin</button>
                <button onClick={mapStore.zoomOut}>zoomout</button>
            </div>
        );
    }
}
