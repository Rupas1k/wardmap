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


const {unit, pixel} = projections


export default class MapComponent extends React.Component {

    MapView = observer(() => {
        // const {mapStore} = useStores()
        const {mapStore} = useStores()
        const mapClickEvent = e => {
            const pixelv = mapStore.map.getEventPixel(e.originalEvent);
            let feature = null
            mapStore.map.forEachFeatureAtPixel(pixelv, function (f, layer) {
                if (f.getGeometry().getType() === "Point") {
                    feature = f
                }
            });

            if (feature) {
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
                //
                // const x_min = mapSize.units.x0
                // const y_min = mapSize.units.y0
                //
                // for(let i = 0; i < 566; i++){
                //     for(let j = 0; j < 566; j++){
                //         if(trees[j][566 - i - 1] > -1){
                //             features.push(new Feature({
                //                 geometry: new Polygon([[
                //                     [x_min + (j) * 32, y_min + (566 - i - 1) * 32],
                //                     [x_min + (j + 1) * 32, y_min + (566 - i - 1) * 32],
                //                     [x_min + (j + 1) * 32, y_min + (566 - i + 1 - 1) * 32],
                //                     [x_min + (j) * 32, y_min + (566 - i + 1 - 1) * 32],
                //                     [x_min + (j) * 32, y_min + (566 - i - 1) * 32]
                //                 ]]).transform(unit, pixel)
                //             }))
                //         }
                //     }
                // }
                // console.log(mapStore.features)
                // mapStore.features = features

                mapStore.setVisionFeature(intersectionFeature)
            } else {
                mapStore.setVisionFeature(new Feature())
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
