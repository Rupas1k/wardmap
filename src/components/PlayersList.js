import {observer} from "mobx-react";
import {useStores} from "../stores/rootStore";
import React from "react";


const PlayersList = observer(() => {
    const {mapStore} = useStores()
    const clusterData = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null
    const page = mapStore.sides[mapStore.currentSide]

    return (
        <div className="players-list">
            <div className="content">
                <div className="players-list-header">
                    <span className="player-name">Player name</span>
                    {/*<span className="player-name">Duration</span>*/}
                    <span className="player-amount">Amount</span>
                </div>
                {clusterData && clusterData[page] ? (
                    <>
                        {clusterData[page].players.map(player => (
                            <div className="player-row" key={player.id}>
                                <span className="player-name">{player.name}</span>
                                {/*<span className="player-name">1:42</span>*/}
                                <span className="player-amount">{player.amount}</span>
                            </div>
                        ))}
                    </>
                ) : (
                    <span style={{"margin": "auto"}}>--</span>
                )}
            </div>
        </div>
    )
})


export default PlayersList