import React from "react";
import MapComponent from "../components/Map";
import MapData from "../components/MapData";
import {Container, Row, Col} from "react-bootstrap";
import {RootStoreProvider} from "../stores/rootStore";

export default class Main extends React.Component {
    render() {
        return (
            <RootStoreProvider>
                <Container className="main" fluid>
                    <Row>
                        <Col className="col-lg-6 col-12 p-0 map-col bg-body">
                            <MapComponent/>
                        </Col>
                        <Col className="col-lg-6 col-12 data-col bg-body-secondary">
                            <MapData/>
                        </Col>
                    </Row>
                </Container>
            </RootStoreProvider>
        )
    }
}