import React from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

function Navigaton() {
  return (
    <Navbar bg="dark" data-bs-theme="dark">
      <Container>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/admin/dashboard/searchengine">Wyszukiwarka</Nav.Link>
            <NavDropdown title="Tabele" id="basic-nav-dropdown">
              <NavDropdown.Item as={Link} to="/admin/dashboard/stock">Tabela asortymentu</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/colors">Tabela kolorów</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/sizes">Tabela rozmiarów</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/category">Tabela kategorii</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/admin/dashboard/users">Użytkownicy</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/goods">Produkty</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/state">Stan</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigaton;