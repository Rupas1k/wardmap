import {action, makeAutoObservable} from "mobx";

class websocketStore {
    constructor(mainStore) {
        this.mainStore = mainStore
        makeAutoObservable(this)
        this.initWebsocket()
    }

    initWebsocket() {
        this.websocket = new WebSocket("ws://localhost:5000/ws")
        this.websocket.addEventListener("open", event => {
            this.onOpen()
        })
        this.websocket.addEventListener("close", () => {
            this.onClose()
        })
        this.websocket.addEventListener("message", ({data}) => {
            this.onMessage(data)
        })
    }

    onOpen() {
        console.log("opened")
        this.websocket.send("opened")
    }

    onClose() {
        setTimeout(() => this.initWebsocket(), 5000)
    }

    onMessage(data) {
        const {wasmStore, wardStore} = this.mainStore
        // wardStore.wardData = wasmStore.runWasm(JSON.parse(data).map(val => Object.values(val)))

        wardStore.wardData = wasmStore.runWasm(JSON.parse(data))

    }
}

export default websocketStore