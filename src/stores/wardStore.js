import {makeAutoObservable} from "mobx";

class wardStore {
    constructor() {
        makeAutoObservable(this)
    }

    wardData = {}
}


const store = new wardStore()

export default store