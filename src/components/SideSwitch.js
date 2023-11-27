import {observer, useLocalObservable} from "mobx-react";
import {useStores} from "../stores/rootStore";
import {Button, ButtonGroup} from "react-bootstrap";


const SideSwitch = observer(() => {
        const {mapStore} = useStores()

        // const sidesStore = useLocalObservable(() => ({
        //     sides: ['radiant', 'dire', 'all'],
        //     currentSide: 2,
        //     setCurrentSide(side){
        //         this.currentSide = side
        //         layers.wards.setStyle(feature => mainStyle(feature, this.sides[this.currentSide]))
        //     },
        // }))

        return (
            <ButtonGroup className="side-switches">
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(0)}
                        disabled={mapStore.currentSide === 0}>Radiant</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(1)}
                        disabled={mapStore.currentSide === 1}>Dire</Button>
                <Button className="btn-dark" onClick={() => mapStore.setCurrentSide(2)}
                        disabled={mapStore.currentSide === 2}>All</Button>
            </ButtonGroup>
        )
    }
)


export default SideSwitch