import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/rootStore";
import {createMap} from "../map/OLMap";
import {click} from "../map/events";
import {Button} from "react-bootstrap";


export default class MapComponent extends React.Component {

    MapView = observer(() => {
        const {mapStore} = useStores()
        useEffect(() => {
            mapStore.setMap(createMap())
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

    MapControllers = observer(() => {
        const {mapStore} = useStores()
        return(
            <div className="debug-buttons">
                <Button className="map-switch btn-secondary" onClick={mapStore.switchMap}>Switch Map</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.setClusters}>Set Data</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.setWasmClusters}>Debug Wasm</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.debugMapTrees}>Debug Trees</Button>
                <Button className="map-switch btn-secondary" onClick={() => mapStore.debugMapElevations(2)}>Debug Elevations</Button>
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
