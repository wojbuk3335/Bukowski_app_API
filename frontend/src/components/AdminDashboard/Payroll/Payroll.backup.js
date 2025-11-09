import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Form, Button, Table, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import './Payroll.module.css';

const Payroll = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workHours, setWorkHours] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  
  // State dla modalu rozliczenia
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Załaduj listę pracowników przy inicjalizacji
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setEmployees(data.employees || []);
      } else {
        setError('Błąd podczas ładowania pracowników');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Błąd połączenia z serwerem');
    }
  };

  const fetchWorkHours = async () => {
    if (!selectedEmployee || !selectedMonth || !selectedYear) {
      setError('Proszę wybrać pracownika, miesiąc i rok');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Pobierz godziny pracy
      const workHoursResponse = await fetch(`/api/work-hours?employeeId=${selectedEmployee}&month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        }
      });
      
      const workHoursData = await workHoursResponse.json();
      
      if (workHoursResponse.ok) {
        setWorkHours(workHoursData.workHours || []);
        // Pobierz zaliczki i wypłaty przed obliczeniem podsumowania
        const financialData = await fetchAdvances();
        calculateSummary(workHoursData.workHours || [], financialData.advances, financialData.payments);
      } else {
        setError(workHoursData.message || 'Błąd podczas ładowania danych');
        setWorkHours([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching work hours:', error);
      setError('Błąd połączenia z serwerem');
      setWorkHours([]);
      setAdvances([]);
      setPayments([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvances = async () => {
    if (!selectedEmployee || !selectedMonth || !selectedYear) {
      return [];
    }

    try {
      // Pobierz zaliczki i wypłaty dla pracownika w danym miesiącu
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString();
      
      // Pobierz zaliczki
      const advancesResponse = await fetch(`/api/financial-operations?type=employee_advance&employeeId=${selectedEmployee}&startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        }
      });
      
      // Pobierz wypłaty
      const paymentsResponse = await fetch(`/api/financial-operations?type=salary_payment&employeeId=${selectedEmployee}&startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        }
      });
      
      const advancesData = await advancesResponse.json();
      const paymentsData = await paymentsResponse.json();
      
      const allAdvances = [];
      const allPayments = [];
      
      if (advancesResponse.ok) {
        allAdvances.push(...(advancesData || []));
      }
      
      if (paymentsResponse.ok) {
        allPayments.push(...(paymentsData || []));
      }
      
      setAdvances(allAdvances);
      setPayments(allPayments);
      return { advances: allAdvances, payments: allPayments };
      
    } catch (error) {
      console.error('Error fetching advances:', error);
      setAdvances([]);
      setPayments([]);
      return { advances: [], payments: [] };
    }
  };

  const calculateSummary = (hours, advancesData = [], paymentsData = []) => {
    const totalHours = hours.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalPay = hours.reduce((sum, record) => sum + (record.dailyPay || 0), 0);
    const totalAdvances = advancesData.reduce((sum, advance) => sum + Math.abs(advance.amount), 0);
    const totalPayments = paymentsData.reduce((sum, payment) => sum + Math.abs(payment.amount), 0);
    const finalPay = totalPay - totalAdvances - totalPayments;
    const workDays = hours.length;
    
    setSummary({
      totalHours: totalHours.toFixed(2),
      totalPay: totalPay.toFixed(2),
      totalAdvances: totalAdvances.toFixed(2),
      totalPayments: totalPayments.toFixed(2),
      finalPay: finalPay.toFixed(2),
      workDays,
      averageHoursPerDay: workDays > 0 ? (totalHours / workDays).toFixed(2) : 0
    });
  };

  const handlePaymentClick = () => {
    if (summary && summary.finalPay) {
      setPaymentAmount(summary.finalPay);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Wprowadź prawidłową kwotę wypłaty');
      return;
    }

    setPaymentLoading(true);
    
    try {
      const employee = employees.find(emp => emp._id === selectedEmployee);
      
      const paymentData = {
        userSymbol: 'ADMIN', // Symbol administratora dokonującego wypłaty
        amount: -parseFloat(paymentAmount), // Ujemna kwota - wypłata
        currency: 'PLN',
        type: 'salary_payment',
        reason: `Wypłata pensji dla ${employee.firstName} ${employee.lastName} za ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
        date: new Date().toISOString(),
        employeeId: selectedEmployee,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeId
      };

      const response = await fetch('/api/financial-operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Wypłata została zarejestrowana pomyślnie!');
        setShowPaymentModal(false);
        setPaymentAmount('');
        // Odśwież dane
        await fetchWorkHours();
      } else {
        alert('Błąd podczas rejestrowania wypłaty: ' + (data.error || data.message));
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Błąd połączenia z serwerem');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getCombinedFinancialData = () => {
    const combinedData = [];
    
    // Dodaj godziny pracy
    workHours.forEach(record => {
      combinedData.push({
        type: 'work_hours',
        date: record.date,
        description: `${record.totalHours}h pracy w ${record.sellingPoint || 'punkt nieznany'}`,
        amount: record.dailyPay || 0,
        details: {
          startTime: record.startTime,
          endTime: record.endTime,
          totalHours: record.totalHours,
          sellingPoint: record.sellingPoint,
          notes: record.notes,
          status: record.status
        },
        color: 'success'
      });
    });
    
    // Dodaj zaliczki
    advances.forEach(advance => {
      combinedData.push({
        type: 'advance',
        date: advance.date,
        description: `Zaliczka pracownika`,
        amount: -Math.abs(advance.amount),
        details: {
          reason: advance.reason,
          currency: advance.currency
        },
        color: 'danger'
      });
    });
    
    // Dodaj wypłaty
    payments.forEach(payment => {
      combinedData.push({
        type: 'payment',
        date: payment.date,
        description: `Wypłata pensji`,
        amount: -Math.abs(payment.amount),
        details: {
          reason: payment.reason,
          currency: payment.currency
        },
        color: 'warning'
      });
    });
    
    // Sortuj po dacie (najnowsze pierwsze)
    return combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const formatTime = (timeString) => {
    return timeString || '-';
  };

  const getSelectedEmployeeName = () => {
    const employee = employees.find(emp => emp._id === selectedEmployee);
    return employee ? `${employee.firstName} ${employee.lastName}` : '';
  };

  const months = [
    { value: '1', label: 'Styczeń' },
    { value: '2', label: 'Luty' },
    { value: '3', label: 'Marzec' },
    { value: '4', label: 'Kwiecień' },
    { value: '5', label: 'Maj' },
    { value: '6', label: 'Czerwiec' },
    { value: '7', label: 'Lipiec' },
    { value: '8', label: 'Sierpień' },
    { value: '9', label: 'Wrzesień' },
    { value: '10', label: 'Październik' },
    { value: '11', label: 'Listopad' },
    { value: '12', label: 'Grudzień' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="fas fa-money-bill-wave me-2"></i>
                Wypłaty Pracowników
              </h4>
            </Card.Header>
            <Card.Body>
              {/* Filtry */}
              <Row className="mb-4">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Pracownik</Form.Label>
                    <Form.Select 
                      value={selectedEmployee} 
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                      <option value="">Wybierz pracownika</option>
                      {employees.map(employee => (
                        <option key={employee._id} value={employee._id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Miesiąc</Form.Label>
                    <Form.Select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="">Wybierz miesiąc</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Rok</Form.Label>
                    <Form.Select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <Button 
                    variant="primary" 
                    onClick={fetchWorkHours}
                    disabled={loading || !selectedEmployee || !selectedMonth || !selectedYear}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Ładowanie...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search me-2"></i>
                        Pokaż wypłaty
                      </>
                    )}
                  </Button>
                </Col>
              </Row>

              {/* Komunikaty błędów */}
              {error && (
                <Alert variant="danger" className="mb-4">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Podsumowanie */}
              {summary && (
                <Row className="mb-4">
                  <Col>
                    <Card className="bg-light">
                      <Card.Header>
                        <h5 className="mb-0">
                          Podsumowanie dla {getSelectedEmployeeName()} - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </h5>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-primary">{summary.workDays}</h3>
                              <p className="mb-0">Dni pracy</p>
                            </div>
                          </Col>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-info">{summary.totalHours}h</h3>
                              <p className="mb-0">Łączne godziny</p>
                            </div>
                          </Col>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-secondary">{summary.totalPay} zł</h3>
                              <p className="mb-0">Wypłata brutto</p>
                            </div>
                          </Col>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-danger">-{summary.totalAdvances} zł</h3>
                              <p className="mb-0">Zaliczki</p>
                            </div>
                          </Col>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-warning">-{summary.totalPayments} zł</h3>
                              <p className="mb-0">Wypłacone</p>
                            </div>
                          </Col>
                          <Col md={2}>
                            <div className="text-center">
                              <h3 className="text-success">{summary.finalPay} zł</h3>
                              <p className="mb-0"><strong>Do wypłaty</strong></p>
                            </div>
                          </Col>
                        </Row>
                        
                        {/* Przycisk rozliczenia */}
                        {summary.finalPay > 0 && (
                          <Row className="mt-3">
                            <Col className="text-center">
                              <Button 
                                variant="success" 
                                size="lg"
                                onClick={handlePaymentClick}
                                disabled={paymentLoading}
                              >
                                <i className="fas fa-credit-card me-2"></i>
                                Rozlicz wypłatę
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Tabela z godzinami pracy */}
              {workHours.length > 0 && (
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Szczegóły godzin pracy</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive>
                      <thead className="table-dark">
                        <tr>
                          <th>Data</th>
                          <th>Punkt sprzedaży</th>
                          <th>Rozpoczęcie</th>
                          <th>Zakończenie</th>
                          <th>Godziny pracy</th>
                          <th>Wypłata dzienna</th>
                          <th>Uwagi</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workHours.map((record, index) => (
                          <tr key={record._id || index}>
                            <td>{formatDate(record.date)}</td>
                            <td>{record.sellingPoint || '-'}</td>
                            <td>{formatTime(record.startTime)}</td>
                            <td>{formatTime(record.endTime)}</td>
                            <td>
                              <Badge bg="info">
                                {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
                              </Badge>
                            </td>
                            <td>
                              <Badge bg="success">
                                {record.dailyPay ? `${record.dailyPay.toFixed(2)} zł` : '-'}
                              </Badge>
                            </td>
                            <td>{record.notes || '-'}</td>
                            <td>
                              <Badge bg={record.totalHours >= 8 ? 'success' : record.totalHours >= 4 ? 'warning' : 'danger'}>
                                {record.totalHours >= 8 ? 'Pełny dzień' : record.totalHours >= 4 ? 'Część dnia' : 'Krótka zmiana'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}

              {/* Tabela z zaliczkami */}
              {advances.length > 0 && (
                <Card className="mt-3">
                  <Card.Header>
                    <h5 className="mb-0">Zaliczki pracownika</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive>
                      <thead className="table-dark">
                        <tr>
                          <th>Data</th>
                          <th>Kwota</th>
                          <th>Waluta</th>
                          <th>Punkt sprzedaży</th>
                          <th>Uwagi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {advances.map((advance, index) => (
                          <tr key={advance._id || index}>
                            <td>{formatDate(advance.date)}</td>
                            <td>
                              <Badge bg="warning">
                                {Math.abs(advance.amount).toFixed(2)} zł
                              </Badge>
                            </td>
                            <td>{advance.currency}</td>
                            <td>{advance.userSymbol || '-'}</td>
                            <td>{advance.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    
                    {/* Podsumowanie zaliczek */}
                    <Row className="mt-3">
                      <Col>
                        <Alert variant="warning">
                          <strong>Suma zaliczek w tym miesiącu: </strong>
                          {advances.reduce((sum, advance) => sum + Math.abs(advance.amount), 0).toFixed(2)} PLN
                        </Alert>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Tabela z historią wypłat */}
              {payments.length > 0 && (
                <Card className="mt-4">
                  <Card.Header>
                    <h5 className="mb-0">Historia wypłat pracownika</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped bordered hover responsive>
                      <thead className="table-dark">
                        <tr>
                          <th>Data wypłaty</th>
                          <th>Kwota</th>
                          <th>Waluta</th>
                          <th>Opis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, index) => (
                          <tr key={payment._id || index}>
                            <td>{formatDate(payment.date)}</td>
                            <td>
                              <Badge bg="success">
                                {Math.abs(payment.amount).toFixed(2)} zł
                              </Badge>
                            </td>
                            <td>{payment.currency}</td>
                            <td>{payment.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    
                    {/* Podsumowanie wypłat */}
                    <Row className="mt-3">
                      <Col>
                        <Alert variant="success">
                          <strong>Suma wypłaconych kwot w tym miesiącu: </strong>
                          {payments.reduce((sum, payment) => sum + Math.abs(payment.amount), 0).toFixed(2)} PLN
                        </Alert>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Komunikat o braku danych */}
              {!loading && workHours.length === 0 && selectedEmployee && selectedMonth && selectedYear && (
                <Alert variant="info" className="text-center">
                  <i className="fas fa-info-circle me-2"></i>
                  Brak danych o godzinach pracy dla wybranego okresu
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Modal rozliczenia wypłaty */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-credit-card me-2"></i>
            Rozlicz wypłatę
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <strong>Pracownik:</strong> {getSelectedEmployeeName()}<br/>
            <strong>Okres:</strong> {months.find(m => m.value === selectedMonth)?.label} {selectedYear}<br/>
            <strong>Kwota do wypłaty:</strong> <span className="text-success">{summary?.finalPay} PLN</span>
          </div>
          
          <Form.Group className="mb-3">
            <Form.Label>Kwota wypłacana:</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              max={summary?.finalPay}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Wprowadź kwotę wypłaty"
            />
            <Form.Text className="text-muted">
              Możesz wypłacić całą kwotę lub część.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowPaymentModal(false)}
            disabled={paymentLoading}
          >
            Anuluj
          </Button>
          <Button 
            variant="success" 
            onClick={handlePaymentSubmit}
            disabled={paymentLoading || !paymentAmount || paymentAmount <= 0}
          >
            {paymentLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Przetwarzanie...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Zatwierdź wypłatę
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Payroll;