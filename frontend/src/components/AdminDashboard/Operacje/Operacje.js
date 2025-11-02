import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Table, Form, Alert } from 'react-bootstrap';

const Operacje = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOperation, setSelectedOperation] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [reasonType, setReasonType] = useState(''); // 'product' or 'other'
  const [selectedProduct, setSelectedProduct] = useState('');
  const [otherReason, setOtherReason] = useState('');

  // Lista dostępnych operacji finansowych
  const operationTypes = [
    { value: '', label: '-- Wszystkie operacje --' },
    { value: 'addition', label: 'Dopisz kwotę' },
    { value: 'deduction', label: 'Odpisz kwotę' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchOperations();
    fetchProducts();
  }, [selectedDate, selectedOperation, selectedUser]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('AdminToken');
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      // Filtruj użytkowników - usuń admin, dom i role administracyjne
      const filteredUsers = (data.users || []).filter(user => {
        const symbol = user.symbol?.toLowerCase();
        const role = user.role?.toLowerCase();
        return symbol !== 'admin' && symbol !== 'dom' && 
               role !== 'superadmin' && role !== 'admin' && role !== 'admin2';
      });
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('AdminToken');
      const response = await fetch('/api/goods/get-all-goods', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Expecting an array of goods
        setProducts(data || []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('AdminToken');
      let url = `/api/financial-operations?date=${selectedDate}`;
      
      if (selectedOperation) {
        url += `&operation=${selectedOperation}`;
      }
      
      if (selectedUser) {
        url += `&user=${selectedUser}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOperations(data);
      } else {
        console.error('Failed to fetch operations');
        setOperations([]);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
      setOperations([]);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const formatCurrency = (amount, currency = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pl-PL');
  };

  const getOperationTypeLabel = (type) => {
    const operation = operationTypes.find(op => op.value === type);
    return operation ? operation.label : type;
  };

  const getOperationBadgeClass = (type) => {
    switch(type) {
      case 'addition':
        return 'bg-success';
      case 'deduction':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>
            Operacje Finansowe
          </h2>
        </Col>
      </Row>

      {/* Filtry */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label style={{ color: 'white' }}>Data:</Form.Label>
            <Form.Control
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ backgroundColor: 'black', color: 'white', border: '1px solid #ddd' }}
            />
          </Form.Group>
        </Col>
        
        <Col md={3}>
          <Form.Group>
            <Form.Label style={{ color: 'white' }}>Typ operacji:</Form.Label>
            <Form.Select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              style={{ backgroundColor: 'black', color: 'white', border: '1px solid #ddd' }}
            >
              {operationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label style={{ color: 'white' }}>Użytkownik:</Form.Label>
            <Form.Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ backgroundColor: 'black', color: 'white', border: '1px solid #ddd' }}
            >
              <option value="">-- Wszyscy użytkownicy --</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.symbol} - {user.sellingPoint || user.email}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={3} className="d-flex align-items-end">
          <Button 
            variant="primary" 
            onClick={fetchOperations}
            disabled={loading}
          >
            {loading ? 'Ładowanie...' : 'Odśwież'}
          </Button>
        </Col>
      </Row>

      {/* Powód dopisania (tylko dla 'Dopisz kwotę') */}
      {selectedOperation === 'addition' && (
        <Row className="mb-3">
          <Col md={12}>
            <Form.Group>
              <Form.Label style={{ color: 'white' }}>Powód dopisania:</Form.Label>
              <div className="d-flex align-items-center" style={{ gap: '20px' }}>
                <Form.Check
                  type="radio"
                  id="reason-product"
                  name="reason"
                  label="Zaliczka na produkt"
                  checked={reasonType === 'product'}
                  onChange={() => { setReasonType('product'); setOtherReason(''); }}
                />
                <Form.Check
                  type="radio"
                  id="reason-other"
                  name="reason"
                  label="Inny powód dopisania"
                  checked={reasonType === 'other'}
                  onChange={() => { setReasonType('other'); setSelectedProduct(''); }}
                />
              </div>

              {/* Jeśli wybrano zaliczkę na produkt - pokaż select z produktami */}
              {reasonType === 'product' && (
                <Form.Select
                  className="mt-2"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  style={{ backgroundColor: 'black', color: 'white', border: '1px solid #ddd' }}
                >
                  <option value="">-- Wybierz produkt --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName || p.code || p.name}</option>
                  ))}
                </Form.Select>
              )}

              {/* Jeśli wybrano inny powód - pokaż input */}
              {reasonType === 'other' && (
                <Form.Control
                  className="mt-2"
                  type="text"
                  placeholder="Wpisz powód dopisania..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  style={{ backgroundColor: 'black', color: 'white', border: '1px solid #ddd' }}
                />
              )}
            </Form.Group>
          </Col>
        </Row>
      )}

      {/* Tabela operacji */}
      <Row>
        <Col>
          {loading ? (
            <Alert variant="info">
              Ładowanie operacji...
            </Alert>
          ) : (
            <Table striped bordered hover variant="dark">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Typ operacji</th>
                  <th>Użytkownik</th>
                  <th>Kwota</th>
                  <th>Waluta</th>
                  <th>Powód</th>
                  <th>Produkt</th>
                  <th>Cena finalna</th>
                  <th>Do dopłaty</th>
                </tr>
              </thead>
              <tbody>
                {operations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">
                      Brak operacji dla wybranych filtrów
                    </td>
                  </tr>
                ) : (
                  operations.map((operation) => (
                    <tr key={operation._id}>
                      <td>{formatDate(operation.createdAt)}</td>
                      <td>
                        <span className={`badge ${getOperationBadgeClass(operation.type)}`}>
                          {getOperationTypeLabel(operation.type)}
                        </span>
                      </td>
                      <td>{operation.userSymbol}</td>
                      <td className={operation.amount >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(operation.amount, operation.currency)}
                      </td>
                      <td>{operation.currency}</td>
                      <td>{operation.reason || '-'}</td>
                      <td>
                        {operation.productName || '-'}
                        {operation.productId && (
                          <small className="text-muted d-block">
                            ID: {operation.productId}
                          </small>
                        )}
                      </td>
                      <td>
                        {operation.finalPrice ? 
                          formatCurrency(operation.finalPrice, operation.currency) : 
                          '-'
                        }
                      </td>
                      <td>
                        {operation.remainingAmount !== undefined ? (
                          <span className={operation.remainingAmount > 0 ? 'text-danger' : 'text-success'}>
                            {formatCurrency(operation.remainingAmount, operation.currency)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Col>
      </Row>

      {/* Podsumowanie */}
      {operations.length > 0 && (
        <Row className="mt-4">
          <Col>
            <div style={{ 
              backgroundColor: '#1a1a1a', 
              padding: '15px', 
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}>
              <h5 style={{ color: 'white', marginBottom: '10px' }}>Podsumowanie:</h5>
              <p style={{ color: 'white', margin: '5px 0' }}>
                Łączna liczba operacji: <strong>{operations.length}</strong>
              </p>
              <p style={{ color: 'white', margin: '5px 0' }}>
                Operacje dodania: <strong style={{ color: '#28a745' }}>
                  {operations.filter(op => op.type === 'addition').length}
                </strong>
              </p>
              <p style={{ color: 'white', margin: '5px 0' }}>
                Operacje odpisania: <strong style={{ color: '#dc3545' }}>
                  {operations.filter(op => op.type === 'deduction').length}
                </strong>
              </p>
            </div>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Operacje;