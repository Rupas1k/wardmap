import React, {useEffect} from "react";
import {observer} from "mobx-react"

import {useStores} from "../stores/rootStore";
import {createMap} from "../map/OLMap";
import {click} from "../map/events";
import debugMapTrees from "../actions/debug/debugMapTrees";
import debugMapElevations from "../actions/debug/debugMapElevations";


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
                <input type="button" className="map-switch btn btn-secondary" value="Switch Map" onClick={mapStore.switchMap}/>
                <input type="button" className="map-switch btn btn-secondary" value="Set Data" onClick={mapStore.setClusters}/>
                <input type="button" className="map-switch btn btn-secondary" value="Debug Wasm" onClick={mapStore.setWasmClusters}/>
                <input type="button" className="map-switch btn btn-secondary" value="Debug Trees" onClick={debugMapTrees}/>
                <input type="button" className="map-switch btn btn-secondary" value="Debug Elevations" onClick={() => debugMapElevations(4)}/>
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
