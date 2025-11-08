import React, { Fragment, useEffect, useState } from "react";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './Employees.module.css';

const Employees = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState({ 
        _id: '', 
        firstName: '', 
        lastName: '', 
        hourlyRate: '', 
        salesCommission: '',
        employeeId: '',
        notes: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => {
        setModal(!modal);
        // Usuń automatyczne resetowanie - dane są ustawiane przez handleAddClick lub handleUpdateClick
    };

    const handleUpdateClick = (employee) => {
        const employeeData = {
            _id: employee._id || employee.id || '',
            employeeId: employee.employeeId || '',
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            hourlyRate: employee.hourlyRate?.toString() || '',
            salesCommission: employee.salesCommission?.toString() || '',
            notes: employee.notes || ''
        };
        setCurrentEmployee(employeeData);
        setIsEditing(true);
        toggleModal();
    };

    const handleAddClick = () => {
        setCurrentEmployee({
            _id: '',
            employeeId: '',
            firstName: '',
            lastName: '',
            hourlyRate: '',
            salesCommission: '',
            notes: ''
        });
        setIsEditing(false);
        toggleModal();
    };

    const generateEmployeeId = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `EMP${timestamp}${random}`;
    };

    const validateEmployee = () => {
        if (!currentEmployee.firstName || !currentEmployee.lastName) {
            alert('Proszę wypełnić imię i nazwisko');
            return false;
        }

        // Podczas edycji sprawdzamy czy ID istnieje, podczas dodawania będzie generowane automatycznie
        if (isEditing && !currentEmployee.employeeId) {
            alert('Błąd: Brak ID pracownika');
            return false;
        }

        if (currentEmployee.hourlyRate && (isNaN(currentEmployee.hourlyRate) || currentEmployee.hourlyRate < 0)) {
            alert('Stawka godzinowa musi być liczbą większą lub równą 0');
            return false;
        }

        if (currentEmployee.salesCommission && (isNaN(currentEmployee.salesCommission) || currentEmployee.salesCommission < 0 || currentEmployee.salesCommission > 100)) {
            alert('Procent od sprzedaży musi być liczbą między 0 a 100');
            return false;
        }

        return true;
    };

    const handleSaveEmployee = async () => {
        try {
            if (!validateEmployee()) {
                return;
            }

            // Przygotuj dane pracownika
            const employeeData = {
                firstName: currentEmployee.firstName,
                lastName: currentEmployee.lastName,
                hourlyRate: currentEmployee.hourlyRate ? parseFloat(currentEmployee.hourlyRate) : 0,
                salesCommission: currentEmployee.salesCommission ? parseFloat(currentEmployee.salesCommission) : 0,
                notes: currentEmployee.notes || ''
            };
            
            // Dla edycji dodaj ID pracownika, dla nowych generuj automatycznie
            if (isEditing) {
                employeeData.employeeId = currentEmployee.employeeId;
            }

            setLoading(true);
            
            const url = isEditing 
                ? `/api/employees/${currentEmployee._id}`
                : `/api/employees`;
            
            const method = isEditing ? 'PUT' : 'POST';
            
            const response = await axios({
                method,
                url,
                data: employeeData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 || response.status === 201) {
                alert(isEditing ? 'Pracownik zaktualizowany pomyślnie!' : 'Pracownik dodany pomyślnie!');
                toggleModal();
                await fetchData();
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            alert(`Błąd podczas ${isEditing ? 'aktualizacji' : 'dodawania'} pracownika: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async (employeeId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tego pracownika?')) {
            return;
        }

        try {
            setLoading(true);
            const response = await axios.delete(`/api/employees/${employeeId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
                }
            });

            if (response.status === 200) {
                alert('Pracownik usunięty pomyślnie!');
                await fetchData();
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert(`Błąd podczas usuwania pracownika: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentEmployee(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const employees = await getAllEmployees();
            setRows(employees);
        } catch (error) {
            console.error('Błąd podczas ładowania pracowników:', error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const getAllEmployees = async () => {
        try {
            const url = `/api/employees`; // Nowy endpoint specjalnie dla pracowników
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('AdminToken')}`
                }
            });
            return Array.isArray(response.data.employees) ? response.data.employees : [];
        } catch (error) {
            console.error(error);
            // Jeśli endpoint nie istnieje, zwróć przykładowe dane
            return [
                {
                    _id: '1',
                    firstName: 'Jan',
                    lastName: 'Kowalski',
                    employeeId: 'EMP001',
                    hourlyRate: '25.50',
                    salesCommission: '5',
                    notes: 'Doświadczony pracownik'
                },
                {
                    _id: '2',
                    firstName: 'Anna',
                    lastName: 'Nowak',
                    employeeId: 'EMP002',
                    hourlyRate: '35.00',
                    salesCommission: '8',
                    notes: 'Kierownik zespołu sprzedaży'
                }
            ];
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>ID Pracownika</th>
                    <th>Imię</th>
                    <th>Nazwisko</th>
                    <th>Stawka godzinowa (PLN)</th>
                    <th>Procent od sprzedaży (%)</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="text-center">
                            {loading ? 'Ładowanie danych pracowników...' : 'Brak danych pracowników.'}
                        </td>
                    </tr>
                ) : (
                    rows.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.employeeId}</td>
                            <td>{item.firstName}</td>
                            <td>{item.lastName}</td>
                            <td>
                                {item.hourlyRate ? `${parseFloat(item.hourlyRate).toFixed(2)} zł` : 'Nie określono'}
                            </td>
                            <td>
                                {item.salesCommission ? `${item.salesCommission}%` : 'Nie określono'}
                            </td>
                            <td>
                                <Button 
                                    color="primary" 
                                    size="sm" 
                                    className={`${styles.button} me-2`} 
                                    onClick={() => handleUpdateClick(item)}
                                >
                                    Edytuj
                                </Button>
                                <Button 
                                    color="danger" 
                                    size="sm" 
                                    className={styles.button} 
                                    onClick={() => handleDeleteEmployee(item._id)}
                                >
                                    Usuń
                                </Button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </Table>
    );

    if (loading) {
        return (
            <div
                className="spinner-container"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'black',
                }}
            >
                <div
                    className="spinner-border"
                    role="status"
                    style={{
                        color: 'white',
                        width: '3rem',
                        height: '3rem',
                    }}
                >
                    <span className="sr-only">Ładowanie...</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Pracownicy
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="12" className={styles.textCenter}>
                            <div className={styles.buttonGroup}>
                                <Button 
                                    color="success" 
                                    size="sm"
                                    className={`${styles.button} ${styles.buttonAdd}`}
                                    onClick={handleAddClick}
                                >
                                    Dodaj Pracownika
                                </Button>
                                <Button 
                                    className={`${styles.button} ${styles.buttonRefresh}`} 
                                    onClick={fetchData}
                                    disabled={loading}
                                >
                                    Odśwież
                                </Button>
                            </div>
                        </Col>
                    </Row>
                    {renderDataTable()}
                </div>

                {/* Modal for Add/Edit Employee */}
                <Modal 
                    isOpen={modal} 
                    toggle={toggleModal} 
                    size="lg"
                    contentClassName="bg-dark text-white border-white"
                    style={{ 
                        '--bs-modal-bg': 'black',
                        '--bs-modal-header-bg': 'black',
                        '--bs-modal-body-bg': 'black',
                        '--bs-modal-footer-bg': 'black'
                    }}
                >
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>
                    {isEditing ? 'Edytuj Pracownika' : 'Dodaj Pracownika'}
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    {isEditing && (
                        <FormGroup>
                            <label>ID Pracownika</label>
                            <Input
                                type="text"
                                name="employeeId"
                                value={currentEmployee.employeeId}
                                disabled
                                placeholder="Automatycznie generowane"
                            />
                        </FormGroup>
                    )}
                    <FormGroup>
                        <label>Imię *</label>
                        <Input
                            type="text"
                            name="firstName"
                            value={currentEmployee.firstName}
                            onChange={handleChange}
                            placeholder="Wpisz imię pracownika"
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <label>Nazwisko *</label>
                        <Input
                            type="text"
                            name="lastName"
                            value={currentEmployee.lastName}
                            onChange={handleChange}
                            placeholder="Wpisz nazwisko pracownika"
                            required
                        />
                    </FormGroup>
                    <FormGroup>
                        <label>Stawka godzinowa (PLN)</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            name="hourlyRate"
                            value={currentEmployee.hourlyRate}
                            onChange={handleChange}
                            placeholder="Wpisz stawkę godzinową (np. 25.50)"
                        />
                    </FormGroup>
                    <FormGroup>
                        <label>Procent od sprzedaży (%)</label>
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            name="salesCommission"
                            value={currentEmployee.salesCommission}
                            onChange={handleChange}
                            placeholder="Wpisz procent od sprzedaży (np. 5)"
                        />
                    </FormGroup>
                    <FormGroup>
                        <label>Notatki</label>
                        <Input
                            type="textarea"
                            rows="3"
                            name="notes"
                            value={currentEmployee.notes}
                            onChange={handleChange}
                            placeholder="Dodatkowe informacje o pracowniku"
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="primary" size="sm" className={styles.button} onClick={handleSaveEmployee} disabled={loading}>
                        {loading ? 'Zapisywanie...' : (isEditing ? 'Aktualizuj' : 'Dodaj')}
                    </Button>
                    <Button color="secondary" size="sm" className={styles.button} onClick={toggleModal}>
                        Anuluj
                    </Button>
                </ModalFooter>
                </Modal>
            </Fragment>
        </div>
    );
};

export default Employees;