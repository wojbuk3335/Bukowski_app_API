import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

function Navigaton() {
  const [showNested, setShowNested] = useState(false);

  return (
    <Navbar bg="dark" data-bs-theme="dark">
      <Container>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="d-flex justify-content-center">
          <Nav className="justify-content-center">
            <NavDropdown title="Wyszukiwarka" id="basic-nav-dropdown">
              <NavDropdown.Item as={Link} to="/admin/dashboard/searchengine/list">Lista</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/searchengine/table">Tabela</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Tabele" id="basic-nav-dropdown">
              <NavDropdown.Item as={Link} to="/admin/dashboard/stock">Tabela asortymentu</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/colors">Tabela kolorów</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/sizes">Tabela rozmiarów</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/dashboard/localization">Tabela lokalizacji</NavDropdown.Item>
              <NavDropdown.Item
                as="div"
                onMouseEnter={() => setShowNested(true)}
                onMouseLeave={() => setShowNested(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '40px', // Set consistent height for all items
                }}
              >
                <span>Tabela kategorii</span>
                <NavDropdown
                  drop="end"
                  title=""
                  id="nested-dropdown"
                  show={showNested}
                  onMouseEnter={() => setShowNested(true)}
                  onMouseLeave={() => setShowNested(false)}
                >
                  <NavDropdown.Item as={Link} to="/admin/dashboard/category/category">Kurtki Kożuchy Futra</NavDropdown.Item>
                </NavDropdown>
              </NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/admin/dashboard/users">Użytkownicy</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/goods">Produkty</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/state">Magazyn</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/sales">Sprzedaż</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/history">Historia</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/addtostate">Dobieranie</Nav.Link>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigaton;