import {makeAutoObservable} from "mobx";

class websocketStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
        this.initWebsocket()
    }

    websocketResult = {}

    initWebsocket() {
        this.websocket = new WebSocket("ws://localhost:5000/ws")
        this.websocket.addEventListener("open", () => {
            this.onOpen()
        })
        this.websocket.addEventListener("close", () => {
            this.onClose()
        })
        this.websocket.addEventListener("message", ({data}) => {
            this.onMessage(data).then(r => console.log("Done"))
        })
    }

    onOpen() {
        console.log("opened")
        this.websocket.send("opened")
    }

    onClose() {
        setTimeout(() => this.initWebsocket(), 5000)
    }

    async onMessage(data) {
        const {wasmStore, wardStore} = this.mainStore
        // wardStore.wardData = wasmStore.runWasm(JSON.parse(data).map(val => Object.values(val)))
        // this.setWebsocketResult(JSON.parse(data))
        this.websocketResult = JSON.parse(data)
        const wardDataMap = new Map(this.websocketResult.map((ward) => [ward.id, ward]));
        wardStore.setWardData(this.websocketResult)
        wardStore.setWardDataHashTable(wardDataMap)
        await wasmStore.runWasm(wardStore.wardData)
    }


    // setWebsocketResult(data){
    //     this.websocketResult = data
    // }
}

export default websocketStore