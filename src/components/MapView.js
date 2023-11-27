import {observer} from "mobx-react";
import {useStores} from "../stores/rootStore";
import {useParams} from "react-router-dom";
import React, {useEffect} from "react";
import {createMap} from "../map/OLMap";
import {click} from "../map/events";
import fetchElevations from "../actions/fetchElevations";
import fetchClusters from "../actions/fetchClusters";


const MapView = observer(() => {
    const {mapStore} = useStores()
    let {leagueId} = useParams()

    if (!leagueId) leagueId = 15909

    useEffect(() => {
        mapStore.setLeague(window.leagues.filter(x => x.id === parseInt(leagueId))[0])

        mapStore.setMap(createMap())
        mapStore.map.addEventListener("click", e => click(e, mapStore))

        // layers.tiles.getSource().setUrl(`${window.location.origin}/static/img/tiles/${mapStore.league["version"]}/default/{z}/{x}/{y}.png`)

        const fetchMapData = async () => {
            const [elevations, clusters] = await Promise.all([
                fetchElevations(mapStore.league.version),
                fetchClusters(leagueId)
            ])

            mapStore.setElevations(elevations)
            mapStore.setClusters(clusters.data.map(cluster_string => JSON.parse(cluster_string)))
        }

        fetchMapData()

        return () => {
            mapStore.map.setTarget(null)
            mapStore.map.removeEventListener("click", e => click(e, mapStore))
        }
    }, [leagueId])

    return (
        <div className="map-wrap">
            <div id="map"></div>
        </div>
    )
})


export default MapView