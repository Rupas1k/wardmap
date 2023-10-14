import React from "react";
import MapComponent from "../components/Map";
import MapData from "../components/MapData";
import {Container, Row, Col} from "react-bootstrap";
import {RootStoreProvider} from "../stores/rootStore";

export default class Main extends React.Component {
    render() {
        return (
            <RootStoreProvider>
                <Container className="container-fluid main" fluid>
                    <Row>
                        <Col className="col-md-7 col-12 p-0 map-col bg-body">
                            <MapComponent/>
                        </Col>
                        <Col className="col-md-5 col-12 data-col bg-body-secondary">
                            <MapData/>
                        </Col>
                    </Row>
                </Container>
            </RootStoreProvider>
        )
    }
}