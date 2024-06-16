import {observer} from "mobx-react";
import {useStores} from "../stores/rootStore";
import {useParams} from "react-router-dom";
import React, {useEffect} from "react";
import {createMap} from "../map/OLMap";
import {click} from "../map/events";
import fetchElevations from "../actions/fetchElevations";
import fetchClusters from "../actions/fetchClusters";
import runWasm from "../actions/runWasm";


const MapView = observer(() => {
    const {mapStore, wardStore} = useStores()
    let {leagueId} = useParams()
    if (!leagueId) leagueId = window.leagues[0].id

    console.log(leagueId)

    useEffect(() => {
        mapStore.setLeague(window.leagues.filter(x => x.id === parseInt(leagueId))[0])
        mapStore.setMap(createMap())
        mapStore.map.addEventListener("click", e => click(e, mapStore))

        const fetchMapData = async () => {
            const [elevations, clusters] = await Promise.all([
                fetchElevations(mapStore.league.version),
                fetchClusters(leagueId),
            ])
            mapStore.setElevations(elevations)
            mapStore.setClusters(clusters.data)
        }

        fetchMapData()

        return () => {
            mapStore.map.setTarget(null)
            mapStore.map.removeEventListener("click", e => click(e, mapStore))
            mapStore.setCurrentFeature(null)
            // mapStore.setFeatures(null)
        }
    })

    return (
        <div className="map-wrap">
            <div id="map"></div>
        </div>
    )
})


export default MapView