import React from "react";
import websocketStore from "./websocketStore";
import wardStore from "./wardStore";

class mainStore{
    constructor() {
        this.websocketStore = new websocketStore(this)
        this.wardStore = new wardStore(this)
    }
}

const StoresContext = React.createContext(new mainStore());

export const useStores = () => React.useContext(StoresContext);