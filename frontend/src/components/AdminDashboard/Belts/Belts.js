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

const Belts = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentBelt, setCurrentBelt] = useState({ _id: '', Belt_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (belt) => {
        setCurrentBelt(belt);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setCurrentBelt({ ...currentBelt, [name]: value });
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current belts to find next Belt_Kod
            const beltList = await getBeltList();
            
            let nextCode;
            if (beltList.length === 0) {
                // First row - start from 1
                nextCode = 1;
            } else {
                // Subsequent rows - increment from max
                const maxCode = Math.max(...beltList.map(belt => Number(belt.Belt_Kod) || 0));
                nextCode = maxCode + 1;
            }

            // Create new belt
            const newBelt = {
                Belt_Kod: nextCode.toString(),
                Belt_Opis: ""
            };

            await axios.post('/api/excel/belts', newBelt);
            
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

            // Check if the Belt_Opis value is unique
            const beltList = await getBeltList();
            const duplicate = beltList.find(belt => belt.Belt_Opis === currentBelt.Belt_Opis && belt._id !== currentBelt._id);

            if (duplicate && currentBelt.Belt_Opis !== "") {
                alert(`Wartość Belt_Opis "${currentBelt.Belt_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.put(`/api/excel/belts/${currentBelt._id}`, { 
                Belt_Kod: currentBelt.Belt_Kod,
                Belt_Opis: currentBelt.Belt_Opis
            });
            fetchData();
            toggleModal();
        } catch (error) {
            console.error('Error updating belt:', error);
            alert('Błąd podczas aktualizacji paska: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await axios.get('/api/excel/belts');
            const belts = Array.isArray(result.data.belts) ? result.data.belts : [];
            
            // Sort by Belt_Kod in descending order (newest/highest codes first)
            const sortedBelts = belts.sort((a, b) => {
                const codeA = parseInt(a.Belt_Kod) || 0;
                const codeB = parseInt(b.Belt_Kod) || 0;
                return codeB - codeA; // Descending order
            });
            
            setRows(sortedBelts);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Błąd podczas pobierania danych: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getBeltList = async () => {
        try {
            const beltResponse = await axios.get('/api/excel/belts');
            return Array.isArray(beltResponse.data.belts) ? beltResponse.data.belts : [];
        } catch (error) {
            console.error('Error fetching belts:', error);
            return [];
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Belt_Kod</th>
                    <th>Belt_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item) => (
                    <tr key={item._id}>
                        <td>{item.Belt_Kod}</td>
                        <td>{item.Belt_Opis}</td>
                        <td>
                            <Button color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>
                                Aktualizuj
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div className={styles.container}>
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Paski
                </h3>
                <div className={styles.container}>
                    <div className={styles.buttonContainer}>
                        <Button 
                            disabled={loading} 
                            color="primary" 
                            size="sm" 
                            className={`${styles.button} ${styles.buttonAdd}`} 
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
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Edytuj opis paska</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="beltOpis">Belt_Opis</Label>
                        <Input
                            id="beltOpis"
                            name="Belt_Opis"
                            type="text"
                            value={currentBelt.Belt_Opis}
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

export default Belts;