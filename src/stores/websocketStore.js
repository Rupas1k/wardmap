import {action, makeAutoObservable} from "mobx";
import wardStore from "./wardStore";

class websocketStore {
    constructor() {
        makeAutoObservable(this)
        this.initWebsocket()
    }

    initWebsocket() {
        this.websocket = new WebSocket("ws://localhost:5000/ws")
        this.websocket.addEventListener("open", event => {this.onOpen()})
        this.websocket.addEventListener("close", () => {this.onClose()})
        this.websocket.addEventListener("message", ({data}) => {this.onMessage(data)})
    }

    onOpen() {
        console.log("opened")
        this.websocket.send("opened")
    }

    onClose() {
        setTimeout(this.initWebsocket, 5000)
    }

    onMessage(data) {
        wardStore.wardData = JSON.parse(data)
    }

}

const store = new websocketStore()

export default store