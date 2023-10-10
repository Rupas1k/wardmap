import {Feature} from "ol";
import {Point} from "ol/geom";

import {projections} from "../../map/projections";

const {unit, pixel} = projections

const debugWardsInWasmCluster = (wardStore, mapStore, feature) => {
    const clusterFeatures = []
    feature.getProperties().data.cluster.forEach(ward_id => {
        let ward = wardStore.wardDataHashTable.get(ward_id)
        clusterFeatures.push(new Feature({
            geometry: new Point([ward.x_pos, ward.y_pos]).transform(unit, pixel),
        }))
        console.log(ward.id)
    })
    mapStore.setFeatures(clusterFeatures)

    console.log(feature.getProperties().data.cluster[0].average_rank)
}

export default debugWardsInWasmCluster