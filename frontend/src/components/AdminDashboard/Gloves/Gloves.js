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

const Gloves = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentGlove, setCurrentGlove] = useState({ _id: '', Glove_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (glove) => {
        setCurrentGlove(glove);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setCurrentGlove({ ...currentGlove, [name]: value });
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current gloves to find next Glove_Kod
            const gloveList = await getGloveList();
            
            let nextCode;
            if (gloveList.length === 0) {
                // First row - start from 1
                nextCode = 1;
            } else {
                // Subsequent rows - increment from max
                const maxCode = Math.max(...gloveList.map(glove => Number(glove.Glove_Kod) || 0));
                nextCode = maxCode + 1;
            }

            // Create new glove
            const newGlove = {
                Glove_Kod: nextCode.toString(),
                Glove_Opis: ""
            };

            await axios.post('/api/excel/gloves', newGlove);
            
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

            // Check if the Glove_Opis value is unique
            const gloveList = await getGloveList();
            const duplicate = gloveList.find(glove => glove.Glove_Opis === currentGlove.Glove_Opis && glove._id !== currentGlove._id);

            if (duplicate && currentGlove.Glove_Opis !== "") {
                alert(`Wartość Glove_Opis "${currentGlove.Glove_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.put(`/api/excel/gloves/${currentGlove._id}`, { 
                Glove_Kod: currentGlove.Glove_Kod,
                Glove_Opis: currentGlove.Glove_Opis
            });
            fetchData();
            toggleModal();
        } catch (error) {
            console.error('Error updating glove:', error);
            alert('Błąd podczas aktualizacji rękawiczki: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = await axios.get('/api/excel/gloves');
            const gloves = Array.isArray(result.data.gloves) ? result.data.gloves : [];
            
            // Sort by Glove_Kod in descending order (newest/highest codes first)
            const sortedGloves = gloves.sort((a, b) => {
                const codeA = parseInt(a.Glove_Kod) || 0;
                const codeB = parseInt(b.Glove_Kod) || 0;
                return codeB - codeA; // Descending order
            });
            
            setRows(sortedGloves);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Błąd podczas pobierania danych: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getGloveList = async () => {
        try {
            const gloveResponse = await axios.get('/api/excel/gloves');
            return Array.isArray(gloveResponse.data.gloves) ? gloveResponse.data.gloves : [];
        } catch (error) {
            console.error('Error fetching gloves:', error);
            return [];
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Glove_Kod</th>
                    <th>Glove_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item) => (
                    <tr key={item._id}>
                        <td>{item.Glove_Kod}</td>
                        <td>{item.Glove_Opis}</td>
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
                    Rękawiczki
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
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Edytuj opis rękawiczki</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="gloveOpis">Glove_Opis</Label>
                        <Input
                            id="gloveOpis"
                            name="Glove_Opis"
                            type="text"
                            value={currentGlove.Glove_Opis}
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

export default Gloves;