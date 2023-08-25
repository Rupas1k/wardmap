import {makeAutoObservable} from "mobx";

class wardStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
    }

    wardDataRequest(){
        // console.log(this)
        if (this.mainStore.websocketStore.websocket.readyState !== WebSocket.CLOSED) this.mainStore.websocketStore.websocket.send('GET')
    }

    clearWardData(){
        this.wardData = {}
    }

    wardData = {}
}

export default wardStore