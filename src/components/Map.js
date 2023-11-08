import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/rootStore";
import {createMap} from "../map/OLMap";
import {click} from "../map/events";
import {Button} from "react-bootstrap";
import Slider from "rc-slider"

import layers from "../map/layers";

export default class MapComponent extends React.Component {

    MapView = observer(() => {
        const {mapStore} = useStores()
        useEffect(() => {
            mapStore.setMap(createMap())
            mapStore.map.addEventListener("click", e => click(e, mapStore))
            layers.tiles.getSource().setUrl(`img/tiles/${mapStore.maps[mapStore.currentMap]}/734d/{z}/{x}/{y}.png`)
            const fetchMapData = async () => {
                mapStore.setElevations(await mapStore.fetchElevations())
                const response = await(await mapStore.fetchClusters())
                // mapStore.setMetadata(JSON.parse(response.metadata))
                mapStore.setRawClusters(response.data.map(cluster_string => JSON.parse(cluster_string)))
                mapStore.setClusters()
            }

            fetchMapData().then(r => console.log("fetched"))

            return () => {
                mapStore.map.setTarget(null)
                mapStore.map.removeEventListener("click", e => click(e, mapStore))
            }
        }, [])
        return (
            <div className="map-wrap">
                <div id="map"></div>
            </div>
        )
    })

    MapControllers = observer(() => {
        const {mapStore} = useStores()
        return(
            <div className="debug-buttons">
                <Button className="map-switch btn-secondary" onClick={mapStore.switchMap}>Switch Map</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.setClusters}>Set Data</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.setWasmClusters}>Debug Wasm</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.debugMapTrees}>Debug Trees</Button>
                <Button className="map-switch btn-secondary" onClick={() => mapStore.debugMapElevations(2)}>Debug Elevations</Button>
                <Slider
                    min={0}
                    max={100}
                    defaultValue={0}
                    step={1}
                    onChange={value => mapStore.setShade(value)}
                />
            </div>
        )
    })

    render() {
        const {MapView, MapControllers} = this
        return (
            <div>
                <MapControllers/>
                <MapView/>
            </div>
        );
    }
}
