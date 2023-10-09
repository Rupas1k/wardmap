import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/rootStore";
import {createMap, vectorLayer, vectorSource} from "../map/OLMap";
import {Feature} from "ol";
import {
    Circle,
    Point,
    Polygon,
} from "ol/geom";
import {fromCircle} from "ol/geom/Polygon";
import {polygon, intersect} from "turf"
// import polygonSmooth from "@turf/polygon-smooth"
import calculateVision from "../map/calculateVision";
// import {GeoJSON} from "ol/format"
import {projections} from "../map/projections";
import {mapSize} from "../map/constants";

import trees from "../map/data/trees.json"
import elevation from "../map/data/elevation.json"


const {unit, pixel} = projections


export default class MapComponent extends React.Component {

    MapView = observer(() => {
        // const {mapStore} = useStores()
        const {mapStore, wardStore} = useStores()
        const mapClickEvent = e => {
            const pixelv = mapStore.map.getEventPixel(e.originalEvent);
            let feature = null
            mapStore.map.forEachFeatureAtPixel(pixelv, function (f, layer) {
                if (f.getGeometry().getType() === "Point") {
                    feature = f
                }
            });

            if (feature) {
                mapStore.currentFeature = feature
                console.log(mapStore.currentFeature)
                // console.log(feature.getProperties().data.cluster)

                const coordinates = feature.getProperties().data.coordinates
                const x = parseInt(coordinates[0] - mapSize.units.x0)
                const y = parseInt(coordinates[1] - mapSize.units.y0)
                const z = (coordinates[2] - 16384) / 128
                const radius = 1600
                const feature1 = new Feature({
                    geometry: new Polygon([calculateVision([x, y, z])]).transform(unit, pixel)
                })
                const feature2 = new Feature({
                    geometry: new fromCircle(new Circle(coordinates, radius), 128).transform(unit, pixel)
                })


                const turfFeature1 = polygon([feature1.getGeometry().getCoordinates()[0]]);
                const turfFeature2 = polygon([feature2.getGeometry().getCoordinates()[0]]);

                // const smooth = polygonSmooth(turfFeature1, {iterations: 10})
                // console.log(smooth.features[0])
                // const intersection = intersect(smooth.features[0], turfFeature2);

                const intersection = intersect(turfFeature1, turfFeature2);
                const intersectionGeometry = new Polygon([intersection.geometry.coordinates[0]]);
                const intersectionFeature = new Feature({
                    geometry: intersectionGeometry,
                });


                // const features = []
                // const x_min = mapSize.units.x0
                // const y_min = mapSize.units.y0
                // const cells = 283 // 283 566
                // const gridsize = 64
                // for(let i = 0; i < cells; i++){
                //     for(let j = 0; j < cells; j++){
                //         if(trees[cells - i - 1][j] > -1){
                //             features.push(new Feature({
                //                 geometry: new Polygon([[
                //                     [x_min + (j - 0.5) * gridsize, y_min + (cells - i - 1 - 1) * gridsize],
                //                     [x_min + (j + 1 - 0.5) * gridsize, y_min + (cells - i - 1 - 1) * gridsize],
                //                     [x_min + (j + 1 - 0.5) * gridsize, y_min + (cells - i + 1 - 1 - 1) * gridsize],
                //                     [x_min + (j - 0.5) * gridsize, y_min + (cells - i + 1 - 1 - 1) * gridsize],
                //                     [x_min + (j - 0.5) * gridsize, y_min + (cells - i - 1 - 1) * gridsize]
                //                 ]]).transform(unit, pixel)
                //             }))
                //         }
                //     }
                // }
                // console.log(mapStore.features)
                // mapStore.features = features

                //
                // const features = []
                // const x_min = mapSize.units.x0
                // const y_min = mapSize.units.y0
                // const cells = 283 // 283 566
                // const gridsize = 64
                // for(let i = 0; i < cells; i++){
                //     for(let j = 0; j < cells; j++){
                //         if(elevation[cells - i - 1][j] / 128 >= 3){
                //             features.push(new Feature({
                //                 geometry: new Polygon([[
                //                     [x_min + (j - 0.5) * gridsize, y_min + (cells - i - 1- 0.5) * gridsize],
                //                     [x_min + (j + 1- 0.5) * gridsize, y_min + (cells - i - 1- 0.5) * gridsize],
                //                     [x_min + (j + 1- 0.5) * gridsize, y_min + (cells - i + 1 - 1- 0.5) * gridsize],
                //                     [x_min + (j- 0.5) * gridsize, y_min + (cells - i + 1 - 1- 0.5) * gridsize],
                //                     [x_min + (j- 0.5) * gridsize, y_min + (cells - i - 1- 0.5) * gridsize],
                //                 ]]).transform(unit, pixel)
                //             }))
                //         }
                //     }
                // }
                // mapStore.features = features


                // const clusterFeatures = []
                // feature.getProperties().data.cluster.forEach(ward_id => {
                //     let ward = wardStore.wardDataHashTable.get(ward_id)
                //     clusterFeatures.push(new Feature({
                //         geometry: new Point([ward.x_pos, ward.y_pos]).transform(unit, pixel),
                //     }))
                //     console.log(ward.id)
                // })
                // mapStore.setFeatures(clusterFeatures)
                //
                // console.log(feature.getProperties().data.cluster[0].average_rank)


                mapStore.setVisionFeature(intersectionFeature)
            } else {
                mapStore.setVisionFeature(new Feature())
                mapStore.currentFeature = null
            }
        }
        useEffect(() => {
            mapStore.setMap(createMap(), vectorLayer, vectorSource)
            mapStore.map.addEventListener("click", mapClickEvent)
            return () => {
                mapStore.map.setTarget(null)
                mapStore.map.removeEventListener("click", mapClickEvent)
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
