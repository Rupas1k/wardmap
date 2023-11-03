import React from "react"
import {Container, Nav, Navbar} from "react-bootstrap";

export default class Header extends React.Component {
    render() {
        return (
            <Navbar expand="sm" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="/">
                        <div className="brand">
                            <img src="/favicon.ico" alt=""/>
                            <span>--</span>
                        </div>
                    </Navbar.Brand>
                    {/*<Nav className="me-auto">*/}
                    <Nav className="">
                        {/*<Nav.Link href="/">Map</Nav.Link>*/}
                        {/*<Nav.Link href="/stats">Stats</Nav.Link>*/}
                        {/*<Nav.Link href="/blog">Blog</Nav.Link>*/}
                        {/*<Nav.Link href="/about">About</Nav.Link>*/}
                    </Nav>
                </Container>
            </Navbar>
        );
    }
}