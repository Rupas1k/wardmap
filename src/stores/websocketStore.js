import {makeAutoObservable} from "mobx";
import runWasm from "../actions/runWasm";

class websocketStore {
    constructor(rootStore) {
        this.rootStore = rootStore
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
        this.websocket.addEventListener("message", async ({data}) => {
            await this.onMessage(data).then(r => console.log("Done"))
        })
    }

    onOpen = () => {
        console.log("opened")
        this.fetchWardData()
    }

    onClose = () => {
        setTimeout(() => this.initWebsocket(), 5000)
    }

    onMessage = async data => {
        const {wardStore} = this.rootStore
        wardStore.setWardData(JSON.parse(data))
    }

    fetchWardData = () => {
        this.websocket.send("fetch")
    }
}


export default websocketStore