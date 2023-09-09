import {makeAutoObservable, reaction} from "mobx";
import runWasm from "../actions/runWasm";

class wardStore {
    constructor(rootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this)
        reaction(
            () => this.wardData,
            async data => {
                this.setWardDataHashTable(new Map(data.map((ward) => [ward.id, ward])))
                this.setClusterData(await runWasm({eps: 64, min_samples: 5}, data))
            }
        )
        reaction(
            () => this.clusterData,
            data => {
                this.rootStore.mapStore.setClusterFeatures()
            }
        )
    }

    wardData = []

    wardDataHashTable = {}

    clusterData = []

    setWardData = data => {
        this.wardData = data
    }

    setClusterData = data => {
        this.clusterData = data
    }

    setWardDataHashTable = data => {
        this.wardDataHashTable = data
    }
}

export default wardStore