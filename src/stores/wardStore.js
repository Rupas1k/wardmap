import {makeAutoObservable} from "mobx";

class wardStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
    }

    wardData = {}

    wardDataHashTable = {}

    clusterData = {}

    wardDataRequest(){
        const {websocketStore} = this.mainStore
        if (websocketStore.websocket.readyState !== WebSocket.CLOSED) websocketStore.websocket.send('GET')
    }

    setWardData(data){
        this.wardData = data
    }

    setWardDataHashTable(data){
        this.wardDataHashTable = data
    }

    setClusterData(data){
        this.clusterData = data
    }



}

export default wardStore