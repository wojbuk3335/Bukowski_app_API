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
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  
  // State dla modalu rozliczenia
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // State dla filtrów tabeli
  const [showWorkHours, setShowWorkHours] = useState(true);
  const [showAdvances, setShowAdvances] = useState(true);
  const [showPayments, setShowPayments] = useState(true);
  const [showCommissions, setShowCommissions] = useState(true);

  // State dla szczegółów prowizji
  const [selectedCommissionDetails, setSelectedCommissionDetails] = useState(null);

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
        // Pobierz zaliczki, wypłaty i prowizje przed obliczeniem podsumowania
        const financialData = await fetchAdvances();
        calculateSummary(workHoursData.workHours || [], financialData.advances, financialData.payments, financialData.commissions);
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
      setCommissions([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvances = async () => {
    if (!selectedEmployee || !selectedMonth || !selectedYear) {
      return { advances: [], payments: [], commissions: [] };
    }

    try {
      // Pobierz zaliczki, wypłaty i prowizje dla pracownika w danym miesiącu
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

      // Pobierz prowizje
      const commissionsResponse = await fetch(`/api/financial-operations?type=sales_commission&employeeId=${selectedEmployee}&startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
        }
      });
      
      const advancesData = await advancesResponse.json();
      const paymentsData = await paymentsResponse.json();
      const commissionsData = await commissionsResponse.json();
      
      const allAdvances = [];
      const allPayments = [];
      const allCommissions = [];
      
      if (advancesResponse.ok) {
        allAdvances.push(...(advancesData || []));
      }
      
      if (paymentsResponse.ok) {
        allPayments.push(...(paymentsData || []));
      }

      if (commissionsResponse.ok) {
        allCommissions.push(...(commissionsData || []));
      }
      
      setAdvances(allAdvances);
      setPayments(allPayments);
      setCommissions(allCommissions);
      return { advances: allAdvances, payments: allPayments, commissions: allCommissions };
      
    } catch (error) {
      console.error('Error fetching advances:', error);
      setAdvances([]);
      setPayments([]);
      return { advances: [], payments: [] };
    }
  };

  const calculateSummary = (hours, advancesData = [], paymentsData = [], commissionsData = []) => {
    const totalHours = hours.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const totalPay = hours.reduce((sum, record) => sum + (record.dailyPay || 0), 0);
    const totalAdvances = advancesData.reduce((sum, advance) => sum + Math.abs(advance.amount), 0);
    const totalPayments = paymentsData.reduce((sum, payment) => sum + Math.abs(payment.amount), 0);
    const totalCommissions = commissionsData.reduce((sum, commission) => sum + (commission.amount || 0), 0);
    const finalPay = totalPay + totalCommissions - totalAdvances - totalPayments;
    const workDays = hours.length;
    
    setSummary({
      totalHours: totalHours.toFixed(2),
      totalPay: totalPay.toFixed(2),
      totalAdvances: totalAdvances.toFixed(2),
      totalPayments: totalPayments.toFixed(2),
      totalCommissions: totalCommissions.toFixed(2),
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
    
    // Dodaj godziny pracy (jeśli filtr jest włączony)
    if (showWorkHours) {
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
    }
    
    // Dodaj zaliczki (jeśli filtr jest włączony)
    if (showAdvances) {
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
    }
    
    // Dodaj wypłaty (jeśli filtr jest włączony)
    if (showPayments) {
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
    }

    // Dodaj prowizje (jeśli filtr jest włączony)
    if (showCommissions) {
      commissions.forEach(commission => {
        combinedData.push({
          type: 'commission',
          date: commission.date,
          description: `Prowizja od sprzedaży`,
          amount: commission.amount || 0,
          details: {
            reason: commission.reason,
            currency: commission.currency,
            salesAmount: commission.salesAmount,
            commissionRate: commission.commissionRate,
            commissionDetails: commission.commissionDetails, // Dodajemy szczegóły prowizji
            employeeName: commission.employeeName
          },
          color: 'info'
        });
      });
    }
    
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <Container fluid className="payroll-container">
      {/* SUPER DEBUG - powinno być widoczne zawsze */}
      <div style={{backgroundColor: 'red', color: 'white', padding: '20px', fontSize: '20px', textAlign: 'center'}}>
        🚨 PAYROLL COMPONENT LOADED! 🚨
      </div>
      
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h4 className="mb-0">
                <i className="fas fa-calculator me-2"></i>
                System wypłat pracowników
              </h4>
            </Card.Header>
            <Card.Body>
              {/* Filtry */}
              <Row className="mb-4">
                <Col md={4}>
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
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Miesiąc</Form.Label>
                    <Form.Select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="">Wybierz miesiąc</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
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
                          <Col md={1}>
                            <div className="text-center">
                              <h3 className="text-success">+{summary.totalCommissions} zł</h3>
                              <p className="mb-0 small">Prowizje</p>
                            </div>
                          </Col>
                          <Col md={1}>
                            <div className="text-center">
                              <h3 className="text-danger">-{summary.totalAdvances} zł</h3>
                              <p className="mb-0 small">Zaliczki</p>
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

              {/* Wspólna tabela - Historia finansowa pracownika */}
              {(workHours.length > 0 || advances.length > 0 || payments.length > 0) && (
                <Card>
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-0">Historia finansowa pracownika</h5>
                        <small className="text-muted">Godziny pracy, zaliczki i wypłaty</small>
                      </div>
                      <div>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-3"
                          onClick={() => {
                            const allOn = showWorkHours && showAdvances && showPayments && showCommissions;
                            setShowWorkHours(!allOn);
                            setShowAdvances(!allOn);
                            setShowPayments(!allOn);
                            setShowCommissions(!allOn);
                          }}
                        >
                          {(showWorkHours && showAdvances && showPayments && showCommissions) ? 'Ukryj wszystko' : 'Pokaż wszystko'}
                        </Button>
                        <Form.Check
                          type="checkbox"
                          id="filter-work-hours"
                          label="Godziny pracy"
                          checked={showWorkHours}
                          onChange={(e) => setShowWorkHours(e.target.checked)}
                          inline
                          className="me-3"
                        />
                        <Form.Check
                          type="checkbox"
                          id="filter-advances"
                          label="Zaliczki"
                          checked={showAdvances}
                          onChange={(e) => setShowAdvances(e.target.checked)}
                          inline
                          className="me-3"
                        />
                        <Form.Check
                          type="checkbox"
                          id="filter-payments"
                          label="Wypłaty"
                          checked={showPayments}
                          onChange={(e) => setShowPayments(e.target.checked)}
                          inline
                          className="me-3"
                        />
                        <Form.Check
                          type="checkbox"
                          id="filter-commissions"
                          label="Prowizje"
                          checked={showCommissions}
                          onChange={(e) => setShowCommissions(e.target.checked)}
                          inline
                        />
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {/* DEBUG: Pokaż ilość danych */}
                    <div style={{backgroundColor: 'yellow', padding: '10px', marginBottom: '10px'}}>
                      <h5>DEBUG INFO:</h5>
                      <p>Wszystkie dane: {getCombinedFinancialData().length}</p>
                      <p>Prowizje: {getCombinedFinancialData().filter(r => r.type === 'commission').length}</p>
                      <p>Typy: {getCombinedFinancialData().map(r => r.type).join(', ')}</p>
                    </div>
                    
                    <Table striped bordered hover responsive>
                      <thead className="table-dark">
                        <tr>
                          <th>Data</th>
                          <th>Typ</th>
                          <th>Opis</th>
                          <th>Kwota</th>
                          <th>Szczegóły</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getCombinedFinancialData().length > 0 ? (
                          getCombinedFinancialData().map((record, index) => (
                            <tr key={`${record.type}-${index}`} onClick={() => alert('RECORD TYPE: ' + record.type)}>
                              <td>{formatDate(record.date)}</td>
                              <td>
                                <Badge bg={
                                  record.type === 'work_hours' ? 'primary' : 
                                  record.type === 'advance' ? 'danger' : 
                                  record.type === 'commission' ? 'info' :
                                  'warning'
                                }>
                                  {record.type === 'work_hours' ? 'Praca' : 
                                   record.type === 'advance' ? 'Zaliczka' : 
                                   record.type === 'commission' ? 'Prowizja' :
                                   'Wypłata'}
                                </Badge>
                              </td>
                              <td>{record.description}</td>
                              <td>
                                <Badge bg={record.amount >= 0 ? 'success' : 'danger'}>
                                  {record.amount >= 0 ? '+' : ''}{record.amount.toFixed(2)} zł
                                </Badge>
                              </td>
                              <td>
                                {record.type === 'work_hours' && (
                                  <small>
                                    {record.details.startTime && record.details.endTime ? 
                                      `${formatTime(record.details.startTime)} - ${formatTime(record.details.endTime)}` : 
                                      '-'
                                    }
                                    {record.details.notes && (
                                      <><br/><em>{record.details.notes}</em></>
                                    )}
                                  </small>
                                )}
                                {record.type === 'advance' && (
                                  <small>
                                    {record.details.reason}
                                  </small>
                                )}
                                {record.type === 'payment' && (
                                  <small>
                                    {record.details.reason}
                                  </small>
                                )}
                                {record.type === 'commission' && (
                                  <div>
                                    <div style={{backgroundColor: 'red', color: 'white', padding: '5px'}}>
                                      DEBUG: To jest prowizja! Type: {record.type}
                                    </div>
                                    <Button 
                                      variant="outline-info" 
                                      size="sm"
                                      onClick={() => alert('Kliknięto Szczegóły!')}
                                    >
                                      SZCZEGÓŁY TEST
                                    </Button>
                                    <div>
                                      <small>
                                        {record.details.reason}
                                        {record.details.salesAmount && record.details.commissionRate && (
                                          <><br/>
                                            <em>Obrót: {record.details.salesAmount.toFixed(2)} zł ({record.details.commissionRate}%)</em>
                                          </>
                                        )}
                                      </small>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center text-muted py-4">
                              {(!showWorkHours && !showAdvances && !showPayments && !showCommissions) ? 
                                'Zaznacz filtry powyżej aby wyświetlić dane' : 
                                'Brak danych do wyświetlenia dla wybranych filtrów'
                              }
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                    
                    {/* Podsumowania */}
                    <Row className="mt-3">
                      {advances.length > 0 && (
                        <Col md={6}>
                          <Alert variant="warning">
                            <strong>Suma zaliczek: </strong>
                            -{advances.reduce((sum, advance) => sum + Math.abs(advance.amount), 0).toFixed(2)} PLN
                          </Alert>
                        </Col>
                      )}
                      {payments.length > 0 && (
                        <Col md={6}>
                          <Alert variant="success">
                            <strong>Suma wypłat: </strong>
                            -{payments.reduce((sum, payment) => sum + Math.abs(payment.amount), 0).toFixed(2)} PLN
                          </Alert>
                        </Col>
                      )}
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

      {/* Modal szczegółów prowizji */}
      <Modal 
        show={selectedCommissionDetails !== null} 
        onHide={() => setSelectedCommissionDetails(null)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-list-ul me-2"></i>
            Szczegóły prowizji
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCommissionDetails && (
            <>
              <div className="mb-3">
                <strong>Pracownik:</strong> {selectedCommissionDetails.employeeName}
                <br />
                <strong>Łączna prowizja:</strong> <Badge bg="success">+{selectedCommissionDetails.totalAmount.toFixed(2)} zł</Badge>
                <br />
                <strong>Łączny obrót:</strong> {selectedCommissionDetails.totalSalesAmount.toFixed(2)} zł
                <br />
                <strong>Stawka prowizji:</strong> {selectedCommissionDetails.commissionRate}%
              </div>
              
              <h6>Szczegółowy breakdown:</h6>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produkt</th>
                    <th>Wartość sprzedaży</th>
                    <th>Prowizja</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCommissionDetails.details.map((detail, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{detail.description || detail.productName}</td>
                      <td>{detail.saleAmount.toFixed(2)} zł</td>
                      <td>
                        <Badge bg="info">+{detail.commissionAmount.toFixed(2)} zł</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedCommissionDetails(null)}>
            Zamknij
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Payroll;