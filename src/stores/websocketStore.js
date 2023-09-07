import {makeAutoObservable, reaction} from "mobx";

class websocketStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
        this.initWebsocket()
    }

    websocket = null

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

    onOpen = () => {
        console.log("opened")
        this.websocket.send("opened")
    }

    onClose = () => {
        setTimeout(() => this.initWebsocket(), 5000)
    }

    onMessage = async data => {
        const {wasmStore, wardStore, mapStore} = this.mainStore
        const websocketResult = JSON.parse(data)
        const wardDataHashTable = new Map(websocketResult.map((ward) => [ward.id, ward]))

        wardStore.setWardData(websocketResult)
        wardStore.setWardDataHashTable(wardDataHashTable)
        wardStore.setClusterData(await wasmStore.runWasm(wardStore.wardData))}
}

// setWebsocketResult(data){
//     this.websocketResult = data
// }

export default websocketStore