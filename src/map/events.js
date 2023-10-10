import {Feature} from "ol";
import {Circle, Polygon} from "ol/geom";
import {fromCircle} from "ol/geom/Polygon";
import {intersect, polygon} from "turf";

import calculateVision from "./calculateVision";
import {mapSize, observer_radius} from "./constants";
import {projections} from "./projections";

const {unit, pixel} = projections


export const click = (e, mapStore) => {
    const this_pixel = mapStore.map.getEventPixel(e.originalEvent);
    let feature = null
    mapStore.map.forEachFeatureAtPixel(this_pixel, function (this_feature, layer) {
        if (this_feature.getGeometry().getType() === "Point") {
            feature = this_feature
        }
    });

    if (feature) {
        const coordinates = feature.getProperties().data.coordinates
        const x = Math.floor(coordinates[0] - mapSize.units.x0)
        const y = Math.floor(coordinates[1] - mapSize.units.y0)
        const z = (coordinates[2] - 16384) / 128
        const radius = observer_radius.day

        const feature1 = new Feature({
            geometry: new Polygon([calculateVision([x, y, z])]).transform(unit, pixel)
        })
        const feature2 = new Feature({
            geometry: new fromCircle(new Circle(coordinates, radius), 128).transform(unit, pixel)
        })


        const turfFeature1 = polygon([feature1.getGeometry().getCoordinates()[0]]);
        const turfFeature2 = polygon([feature2.getGeometry().getCoordinates()[0]]);

        const intersection = intersect(turfFeature1, turfFeature2);
        const intersectionGeometry = new Polygon([intersection.geometry.coordinates[0]]);
        const intersectionFeature = new Feature({
            geometry: intersectionGeometry,
        });

        mapStore.currentFeature = feature
        mapStore.setVisionFeature(intersectionFeature)
    } else {
        mapStore.setVisionFeature(new Feature())
        mapStore.currentFeature = null
    }
}