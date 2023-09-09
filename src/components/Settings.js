import React, {useEffect} from "react";
import {observer} from "mobx-react"
import {useStores} from "../stores/rootStore";
import {Container, Row, Col, ButtonGroup, Button} from "react-bootstrap";
import RangeSlider from "react-bootstrap-range-slider";

export default class Settings extends React.Component {
    render() {
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
                        {/*<WardData/>*/}
                        {/*<RangeSlider/>*/}
                    </Col>
                </Row>
            </Container>
        );
    }
}
