import {makeAutoObservable} from "mobx";

class mapStore {
    map = null;

    constructor() {
        makeAutoObservable(this);
    }

    setMap = mapInstance => {
        this.map = mapInstance;
    }

    zoomIn = () => {
        let view = this.map.getView()
        view.setZoom(view.getZoom() + 1)
    }

    zoomOut = () => {
        let view = this.map.getView()
        view.setZoom(view.getZoom() - 1)
    }
}

const store = new mapStore()
export default store