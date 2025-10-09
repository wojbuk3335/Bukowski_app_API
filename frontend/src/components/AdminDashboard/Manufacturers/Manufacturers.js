import React, { Fragment, useEffect, useState } from "react";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Label,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from '../Category/Category.module.css';

const Manufacturers = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentManufacturer, setCurrentManufacturer] = useState({ _id: '', Prod_Kod: '', Prod_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (manufacturer) => {
        setCurrentManufacturer(manufacturer);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setCurrentManufacturer({ ...currentManufacturer, [name]: value });
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current manufacturers to find next Prod_Kod
            const manufacturerList = await getManufacturerList();
            
            let nextCode;
            if (manufacturerList.length === 0) {
                // First row - start from 1
                nextCode = 1;
            } else {
                // Subsequent rows - increment from max
                const maxCode = Math.max(...manufacturerList.map(mfr => Number(mfr.Prod_Kod) || 0));
                nextCode = maxCode + 1;
            }

            // Create new manufacturer
            const newManufacturer = {
                Prod_Kod: nextCode.toString(),
                Prod_Opis: ""
            };

            await axios.post('/api/excel/manufacturers', newManufacturer);
            
            fetchData();
            alert('Nowy wiersz został dodany pomyślnie!');
        } catch (error) {
            console.error('Error adding new row:', error);
            alert('Błąd podczas dodawania nowego wiersza: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Prod_Opis value is unique
            const manufacturerList = await getManufacturerList();
            const duplicate = manufacturerList.find(manufacturer => manufacturer.Prod_Opis === currentManufacturer.Prod_Opis && manufacturer._id !== currentManufacturer._id);

            if (duplicate && currentManufacturer.Prod_Opis !== "") {
                alert(`Wartość Prod_Opis "${currentManufacturer.Prod_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.put(`/api/excel/manufacturers/${currentManufacturer._id}`, { 
                Prod_Kod: currentManufacturer.Prod_Kod,
                Prod_Opis: currentManufacturer.Prod_Opis
            });
            fetchData();
            toggleModal();
        } catch (error) {
            console.error('Error updating manufacturer:', error);
            alert('Błąd podczas aktualizacji producenta: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await axios.get('/api/excel/manufacturers');
            const manufacturers = Array.isArray(result.data.manufacturers) ? result.data.manufacturers : [];
            
            // Sort by Prod_Kod in descending order (newest/highest codes first)
            const sortedManufacturers = manufacturers.sort((a, b) => {
                const codeA = parseInt(a.Prod_Kod) || 0;
                const codeB = parseInt(b.Prod_Kod) || 0;
                return codeB - codeA; // Descending order
            });
            
            setRows(sortedManufacturers);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Błąd podczas pobierania danych: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getManufacturerList = async () => {
        try {
            const manufacturerResponse = await axios.get('/api/excel/manufacturers');
            return Array.isArray(manufacturerResponse.data.manufacturers) ? manufacturerResponse.data.manufacturers : [];
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
            return [];
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Prod_Kod</th>
                    <th>Prod_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td>{item.Prod_Kod}</td>
                        <td>{item.Prod_Opis}</td>
                        <td>
                            <Button color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
                        </td>
                    </tr>
                ))}
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
                    <span className="sr-only"></span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Producenci
                </h3>
                <div className={styles.container}>
                    <div className={styles.buttonGroup}>
                        <Button 
                            disabled={loading} 
                            color="primary" 
                            size="sm" 
                            className={`${styles.button} ${styles.mb3}`} 
                            onClick={addNewRow}
                        >
                            Dodaj nowy wiersz
                        </Button>
                        <Button 
                            className={`${styles.button} ${styles.buttonRefresh}`} 
                            onClick={fetchData}
                        >
                            Odśwież
                        </Button>
                    </div>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Edytuj opis producenta</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="prodOpis">Prod_Opis</Label>
                        <Input
                            id="prodOpis"
                            name="Prod_Opis"
                            type="text"
                            value={currentManufacturer.Prod_Opis}
                            onChange={handleUpdateChange}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="primary" size="sm" className={styles.button} onClick={handleUpdateSubmit}>Aktualizuj</Button>{' '}
                    <Button color="secondary" size="sm" className={styles.button} onClick={toggleModal}>Anuluj</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Manufacturers;