import React from "react"
import {Container, Dropdown, Nav, Navbar} from "react-bootstrap";

export default class Header extends React.Component {
    render() {
        return (
            <Navbar expand="sm" className="bg-body-tertiary">
                <Container className="header-container" fluid>
                    <Navbar.Brand href="/">
                        <div className="brand">
                            <img src="/favicon.ico" alt=""/>
                            <span>Dota2WardMap Preview</span>
                        </div>
                    </Navbar.Brand>
                    <Nav>
                        <Dropdown align="end">
                            <Dropdown.Toggle variant="" id="dropdown-basic">Leagues</Dropdown.Toggle>
                            <Dropdown.Menu>
                                {window.leagues.map(league => {
                                    return <Dropdown.Item key={league.id} href={`/league/${league.id}`}>{league.name}</Dropdown.Item>
                                })}
                            </Dropdown.Menu>
                        </Dropdown>
                        <Nav.Link href="/about">About</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>
        );
    }
}