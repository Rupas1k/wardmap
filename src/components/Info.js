import React from "react";
import {inject, observer} from "mobx-react"
import {useStores} from "../stores/mainStore";

export default class Info extends React.Component {
    WardData = observer(() => {
        const {wardStore, websocketStore} = useStores()
        let wardData = wardStore.wardData

        return (
            <div>
                <input type="button" value="clear" onClick={() => wardStore.clearWardData()}/>
                <input type="button" value="update" onClick={() => wardStore.wardDataRequest()}/>
                {JSON.stringify(wardData)}
            </div>
        )
    })
    render() {
        return (
            <div>
                Info
                <this.WardData />
            </div>
        );
    }
}
