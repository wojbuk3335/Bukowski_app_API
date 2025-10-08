import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container,
    Row,
    Col,
    Button,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Input,
    Label
} from 'reactstrap';

const RemainingProductsSubcategory = () => {
    const [data, setData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentData, setCurrentData] = useState({});
    const [isEditing, setIsEditing] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/excel/remaining-category/get-all-remaining-categories`);
            
            // Sort by Rem_Kat_1_Kod_1 descending (newest first)
            const sortedData = response.data.remainingCategories.sort((a, b) => {
                const aNum = parseInt(a.Rem_Kat_1_Kod_1) || 0;
                const bNum = parseInt(b.Rem_Kat_1_Kod_1) || 0;
                return bNum - aNum;
            });
            
            setData(sortedData);
        } catch (error) {
            console.error('Error fetching data:', error);
            showAlert('Błąd podczas pobierania danych', 'danger');
        }
    };

    const addNewRow = async () => {
        try {
            // Generate new Rem_Kat_1_Kod_1 (highest existing + 1)
            const maxRemKat1Kod1 = data.length > 0 ? Math.max(...data.map(item => parseInt(item.Rem_Kat_1_Kod_1) || 0)) : 0;
            const newRemKat1Kod1 = maxRemKat1Kod1 + 1;

            const newRow = {
                Rem_Kat_1_Kod_1: newRemKat1Kod1.toString(),
                Rem_Kat_1_Opis_1: '',
                Plec: 'D',
                number_id: newRemKat1Kod1
            };

            const response = await axios.post(`${API_BASE_URL}/api/excel/remaining-category/insert-many-remaining-categories`, [newRow]);
            
            if (response.status === 201) {
                await fetchData(); // Refresh data
                showAlert('Nowy wiersz został dodany pomyślnie', 'success');
            }
        } catch (error) {
            console.error('Error adding new row:', error);
            showAlert('Błąd podczas dodawania nowego wiersza', 'danger');
        }
    };

    const handleEdit = (item) => {
        setCurrentData({ ...item });
        setIsEditing(true);
        setModalOpen(true);
    };

    const handleUpdateChange = (field, value) => {
        setCurrentData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        try {
            const response = await axios.patch(
                `${API_BASE_URL}/api/excel/remaining-category/update-remaining-category/${currentData._id}`,
                {
                    Rem_Kat_1_Kod_1: currentData.Rem_Kat_1_Kod_1,
                    Rem_Kat_1_Opis_1: currentData.Rem_Kat_1_Opis_1,
                    Plec: currentData.Plec,
                    number_id: currentData.number_id
                }
            );

            if (response.status === 200) {
                await fetchData();
                setModalOpen(false);
                showAlert('Dane zostały zaktualizowane pomyślnie', 'success');
            }
        } catch (error) {
            console.error('Error updating data:', error);
            if (error.response?.data?.message) {
                showAlert(error.response.data.message, 'danger');
            } else {
                showAlert('Błąd podczas aktualizacji danych', 'danger');
            }
        }
    };

    const showAlert = (message, color) => {
        alert(message);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentData({});
        setIsEditing(false);
    };

    return (
        <Container fluid className="p-4" data-testid="remaining-products-subcategory-component">
            <Row>
                <Col>
                    <h2 style={{ color: 'white' }}>Podkategorie - Pozostały asortyment</h2>
                    
                    <div className="mb-3">
                        <Button 
                            color="primary" 
                            onClick={addNewRow}
                            style={{ marginBottom: '10px' }}
                        >
                            Dodaj nowy wiersz
                        </Button>
                        <Button 
                            color="secondary" 
                            onClick={fetchData}
                            style={{ marginBottom: '10px', marginLeft: '10px' }}
                        >
                            Odśwież
                        </Button>
                    </div>

                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Rem_Kat_1_Kod_1</th>
                                <th>Rem_Kat_1_Opis_1</th>
                                <th>Rodzaj</th>
                                <th>Akcje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td>{item.Rem_Kat_1_Kod_1}</td>
                                    <td>{item.Rem_Kat_1_Opis_1}</td>
                                    <td>{item.Plec}</td>
                                    <td>
                                        <Button 
                                            color="primary" 
                                            size="sm" 
                                            onClick={() => handleEdit(item)}
                                        >
                                            Aktualizuj
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <Modal isOpen={modalOpen} toggle={closeModal}>
                        <ModalHeader toggle={closeModal}>
                            {isEditing ? 'Edytuj kategorię' : 'Nowa kategoria'}
                        </ModalHeader>
                        <ModalBody>
                            <FormGroup>
                                <Label for="remKat1Kod1">Rem_Kat_1_Kod_1</Label>
                                <Input
                                    type="text"
                                    id="remKat1Kod1"
                                    value={currentData.Rem_Kat_1_Kod_1 || ''}
                                    onChange={(e) => handleUpdateChange('Rem_Kat_1_Kod_1', e.target.value)}
                                    readOnly
                                    disabled
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label for="remKat1Opis1">Rem_Kat_1_Opis_1</Label>
                                <Input
                                    type="text"
                                    id="remKat1Opis1"
                                    value={currentData.Rem_Kat_1_Opis_1 || ''}
                                    onChange={(e) => handleUpdateChange('Rem_Kat_1_Opis_1', e.target.value)}
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label for="plec">Rodzaj</Label>
                                <Input
                                    type="select"
                                    id="plec"
                                    value={currentData.Plec || 'D'}
                                    onChange={(e) => handleUpdateChange('Plec', e.target.value)}
                                >
                                    <option value="D">D</option>
                                    <option value="M">M</option>
                                    <option value="Dz">Dz</option>
                                </Input>
                            </FormGroup>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" onClick={handleSave}>
                                Zapisz
                            </Button>
                            <Button color="secondary" onClick={closeModal}>
                                Anuluj
                            </Button>
                        </ModalFooter>
                    </Modal>
                </Col>
            </Row>
        </Container>
    );
};

export default RemainingProductsSubcategory;