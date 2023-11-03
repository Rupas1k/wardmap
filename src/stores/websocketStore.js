import {makeAutoObservable} from "mobx";
import mapStore from "./mapStore";

class websocketStore {
    constructor(rootStore) {
        this.rootStore = rootStore
        makeAutoObservable(this)
        this.initWebsocket()
    }

    websocket = null

    initWebsocket() {
        this.websocket = new WebSocket("ws://192.168.1.196:5000/ws")
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
        // this.fetchClusters()
        // this.fetchWardData()
        // this.fetchMetaData()
    }

    onClose = () => {
        setTimeout(() => this.initWebsocket(), 5000)
    }

    onMessage = async response => {
        const {wardStore, mapStore} = this.rootStore
        const {type, data} = JSON.parse(response)
        switch (type) {
            case "wards":
                wardStore.setWardData(JSON.parse(data))
                break
            case "clusters":
                const clusters = data.map(cluster_string => JSON.parse(cluster_string));
                // wardStore.setClusters(clusters)
                break
            case "metadata":
                const about = JSON.parse(data)
                console.log(about)
        }
    }

    fetchWardData = () => {
        this.websocket.send(JSON.stringify({type: "wards"}))
    }

    fetchClusters = () => {
        this.websocket.send(JSON.stringify({type: "clusters"}))
    }

    fetchMetaData = () => {
        this.websocket.send(JSON.stringify({type: "metadata"}))
    }
}


export default websocketStore