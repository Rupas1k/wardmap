import React from "react";
import websocketStore from "./websocketStore";
import wardStore from "./wardStore";
import wasmStore from "./wasmStore";

class mainStore{
    constructor() {
        this.websocketStore = new websocketStore(this)
        this.wardStore = new wardStore(this)
        this.wasmStore = new wasmStore(this)
    }
}

const StoresContext = React.createContext(new mainStore());

export const useStores = () => React.useContext(StoresContext);