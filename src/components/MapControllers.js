import {observer, useLocalObservable} from "mobx-react";
import {useStores} from "../stores/rootStore";
import {Button} from "react-bootstrap";
import {BsFillGearFill} from "react-icons/bs";
import Slider from "rc-slider";
import React, {useEffect} from "react";
import layers from "../map/layers";
import fetchClusters from "../actions/fetchClusters";
import {useParams} from "react-router-dom";
import {homepage} from "../const";


const MapControllers = observer(() => {
    const {mapStore} = useStores()
    let {leagueId} = useParams()
    if (!leagueId) leagueId = window.leagues[0].id


    const shade = useLocalObservable(() => ({
        shade: 0,
        setShade(value) {
            this.shade = value
            layers.shade.getStyle().getFill().setColor([0, 0, 0, this.shade / 100])
            layers.shade.changed()
        }
    }))

    const map = useLocalObservable(() => ({
        maps: ['default', 'divine_sanctum'],
        currentMap: 1,
        league: undefined,
        switchMap() {
            this.currentMap = this.currentMap < this.maps.length - 1 ? this.currentMap + 1 : 0
            layers.tiles.getSource().setUrl(`${homepage}/static/img/tiles/${map.league.version}/${this.maps[this.currentMap]}/{z}/{x}/{y}.png`)
        }
    }))

    const visibility = useLocalObservable(() => ({
        visibility: 0,
        switchVisibility(){
            this.visibility = !this.visibility
        }
    }))

    useEffect(() => {
        map.league = window.leagues.filter(x => x.id === parseInt(leagueId))[0]
        layers.tiles.getSource().setUrl(`${homepage}/static/img/tiles/${map.league.version}/${map.maps[map.currentMap]}/{z}/{x}/{y}.png`)
    })

    return (
        <div>
            <Button className="btn-secondary settings" onClick={visibility.switchVisibility}>
                <BsFillGearFill/>
            </Button>
            <div className="debug-buttons" style={{"display": visibility.visibility ? "flex" : "none"}}>
                <Button className="map-switch btn-secondary" onClick={map.switchMap}>Switch Map</Button>
                <Button className="map-switch btn-secondary" onClick={async () => mapStore.setClusters((await fetchClusters(mapStore.league.id)).data)}>Set Data</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.setWasmClusters}>Debug Wasm</Button>
                <Button className="map-switch btn-secondary" onClick={mapStore.debugMapTrees}>Debug Trees</Button>
                <Button className="map-switch btn-secondary" onClick={() => mapStore.debugMapElevations(2)}>Debug Elevations</Button>
                {/*<Button className="map-switch btn-secondary" onClick={() => mapStore.league.id = 15728}>League</Button>*/}
                <div className="shade">
                    <span>Shade</span>
                    <Slider
                        min={0}
                        max={100}
                        defaultValue={0}
                        step={1}
                        onChange={value => shade.setShade(value)}
                    />
                </div>
            </div>
        </div>
    )
})


export default MapControllers