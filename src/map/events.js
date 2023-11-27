export const click = (e, mapStore) => {
    const this_pixel = mapStore.map.getEventPixel(e.originalEvent);

    let feature = null
    mapStore.map.forEachFeatureAtPixel(this_pixel, (this_feature) => {
        if (this_feature.getGeometry().getType() === "Point") {
            feature = this_feature
        }
    });

    mapStore.setCurrentFeature(feature)
}