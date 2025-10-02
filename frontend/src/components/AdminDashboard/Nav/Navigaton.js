import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

function Navigaton() {
  const [showNested, setShowNested] = useState(false);
  const [states, setStates] = useState([]);

  // Fetch users/states from API
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        // Filtruj użytkowników - usuń tylko admin, pozostaw magazyn, dom i zwykłych użytkowników
        const filteredStates = (data.users || []).filter(user => {
          const role = user.role?.toLowerCase();
          return role !== 'admin';
        });
        
        setStates(filteredStates);
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    };

    fetchStates();
  }, []);

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
              <NavDropdown.Item as={Link} to="/admin/dashboard/bags">Tabela torebek</NavDropdown.Item>
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
                  <NavDropdown.Item as={Link} to="/admin/dashboard/category/bags">Torebki</NavDropdown.Item>
                </NavDropdown>
              </NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/admin/dashboard/users">Użytkownicy</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/goods">Produkty</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/warehouse">Magazyn</Nav.Link>
            <NavDropdown title="Stany" id="states-nav-dropdown">
              {states.map((state) => (
                <NavDropdown.Item 
                  key={state._id} 
                  as={Link} 
                  to={`/admin/dashboard/state/${state._id}`}
                >
                  {state.role === 'magazyn' ? 'Magazyn' : 
                   state.role === 'dom' ? 'Dom' : 
                   state.sellingPoint || state.symbol}
                </NavDropdown.Item>
              ))}
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/admin/dashboard/state">Wszystkie stany</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/admin/dashboard/sales">Sprzedaż</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/history">Historia</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/corrections">Korekty</Nav.Link>
            <Nav.Link as={Link} to="/admin/dashboard/addtostate">Dobieranie</Nav.Link>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigaton;