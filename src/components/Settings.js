import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/mainStore";
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import RangeSlider from "react-bootstrap-range-slider";

export default class Settings extends React.Component {
    EpsInput = observer(() => {
        const {wasmStore, wardStore} = useStores()
        return (
            <div>
                <div>Current eps: {wasmStore.params.eps}, min_samples: {wasmStore.params.min_samples}</div>
                <input type="text" value={wasmStore.params.eps} onChange={wasmStore.onEpsChange} onBlur={async () => {
                    let wasmResult = await wasmStore.runWasm(wardStore.wardData)
                    wardStore.setClusterData(wasmResult);
                }
                }/>
                <input type="text" value={wasmStore.params.min_samples} onChange={wasmStore.onMinSamplesChange}
                       onBlur={async () => {
                           let wasmResult = await wasmStore.runWasm(wardStore.wardData)
                           wardStore.setClusterData(wasmResult);
                       }}/>
            </div>
        )
    })
    WardData = observer(() => {
        const {wardStore, wasmStore, mapStore} = useStores()
        const {EpsInput} = this
        return (
            <div>
                <EpsInput/>
                <input type="button" value="clear" onClick={() => wardStore.setClusterData([])}/>
                <input type="button" value="update" onClick={() => wardStore.wardDataRequest()}/>
                <input type="button" value="run" onClick={async () => {
                    wasmStore.params.appx = true;
                    let wasmResult = await wasmStore.runWasm(wardStore.wardData)
                    wardStore.setClusterData(wasmResult);
                }}/>
                <input type="button" value="updateParams" onClick={() => {
                    wasmStore.params.eps = 1
                }}/>
                <br/>
                {/*{JSON.stringify(mapStore.layers)}*/}
            </div>
        )
    })

    render() {
        const {WardData} = this
        return (
            <Container fluid className="settings">
                <Row>
                    <Col className="buttons-col">
                        <ButtonGroup className="settings-list">
                            <Button variant="outline-secondary">Dataset</Button>
                            <Button variant="outline-secondary">Layers</Button>
                            <Button variant="outline-secondary">Advanced</Button>
                        </ButtonGroup>
                        <Button variant="outline-secondary">Ward Info</Button>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <WardData/>
                        {/*<RangeSlider/>*/}
                    </Col>
                </Row>
            </Container>
        );
    }
}
