import React from "react";
import {observer} from "mobx-react"
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import {useStores} from "../stores/rootStore";

import LineChart, {labels} from "./charts/LineChart";
import ClusterCol from "./ClusterCol";


const timeFormat = seconds => {
    const absSeconds = Math.abs(seconds);
    const minutes = Math.floor(absSeconds / 60);
    const secondsRemainder = absSeconds % 60;

    const sign = seconds < 0 ? '-' : '';

    return `${sign}${String(minutes).padStart(2, "0")}:${String(secondsRemainder).padStart(2, "0")}`;
}

export default class MapData extends React.Component {

    DataSwitches = observer(() => {
        const {mapStore} = useStores()
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
    })

    ClusterData = observer(() => {
        const {mapStore} = useStores()

        const cluster_data = mapStore.currentFeature !== null ? mapStore.currentFeature.getProperties().data.cluster : null
        const average = mapStore.averageValues

        const page = mapStore.sides[mapStore.currentSide]

        const {DataSwitches} = this

        const cluster_info = (
            <div className="cluster-info">
                <DataSwitches/>
                <div className="rows">
                    <Container className="data-rows" fluid>
                        <Row>
                            <ClusterCol
                                name="Amount"
                                data={cluster_data && cluster_data[page] ? cluster_data[page].amount : "--"}
                            />
                            <ClusterCol
                                name="Destroyed"
                                data={cluster_data && cluster_data[page] ? cluster_data[page].destroyed : "--"}
                            />
                            <ClusterCol
                                name="% Survived"
                                data={cluster_data && cluster_data[page] ? `${((1 - cluster_data[page].destroyed / cluster_data[page].amount) * 100).toFixed(2)}%` : "--"}
                            />
                            <ClusterCol
                                name="Duration"
                                data={cluster_data && cluster_data[page] ? timeFormat(cluster_data[page].duration) : "--"}
                                // delta={`${cluster_data[page].duration >= average[page].duration ? '+' : '-'}${timeFormat(Math.abs(cluster_data[page].duration - average[page].duration))}`}
                            />
                            <ClusterCol
                                name="Time Placed"
                                data={cluster_data && cluster_data[page] ? timeFormat(cluster_data[page].time_placed) : "--"}
                            />
                            <ClusterCol
                                name="Gold lead"
                                data={cluster_data && cluster_data[page] && cluster_data[page].advantage ?
                                    <span className={cluster_data[page].advantage >= 0 ? "green" : "red"}>
                                        {cluster_data[page].advantage || "--"}
                                    </span>
                                    : "--"}
                            />
                        </Row>
                        <Row>
                            <Col className="col-lg-6 col-12" style={{height: "300px"}}>
                                <LineChart
                                    data={{
                                        labels: labels.timeline,
                                        datasets: [{
                                            data: cluster_data ? cluster_data.graphs.wards : {}
                                        }]
                                    }}
                                    options={{
                                        plugins: {
                                            title: {
                                                display: true,
                                                text: "Amount by minute"
                                            },
                                            legend: {
                                                display: false
                                            }
                                        }
                                    }}
                                />
                            </Col>
                            {/*<Col className="col-lg-6 col-12"><LineChart /></Col>*/}
                            <Col>
                                <table width="100%">
                                    {cluster_data && cluster_data.players ? cluster_data.players.map(player => {
                                        return (
                                            <tr>
                                                <td>{player.player_placed_id}</td>
                                                <td>{player.amount}</td>
                                            </tr>
                                        )
                                    }) : "--"}
                                </table>
                            </Col>
                        </Row>
                        <Row>
                            {/*<Col className="col-lg-6 col-12" style={{height: "300px"}}><LineChart /></Col>*/}
                            {/*<Col className="col-lg-6 col-12"><LineChart /></Col>*/}
                        </Row>
                    </Container>
                </div>
            </div>
        );

        return (
            <>
                {cluster_info}
            </>
        )
    })

    NoWard = observer(() => {
        const {mapStore} = useStores()
        return (mapStore.currentFeature === null ? <div className="not-selected">No ward selected</div> : <div></div>)
    })

    render() {
        const {ClusterData} = this

        return (
            <ClusterData/>
        )
    }
}