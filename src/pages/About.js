import React from "react";
import {Col, Container, Row} from "react-bootstrap";
import Header from "../components/common/Header";

export default class About extends React.Component {

    render() {
        return (
            <>
                <Header/>
                <Container>
                    <Row>
                        <Col>
                            <div className="about">
                                About me:
                                <ul>
                                    <li>123</li>
                                    <li>123</li>
                                    <li>123</li>
                                </ul>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </>
        )
    }

}