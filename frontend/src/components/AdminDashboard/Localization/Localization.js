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
import styles from './Localization.module.css';

const Localization = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentLocalization, setCurrentLocalization] = useState({ _id: '', Miejsc_1_Opis_1: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (localization) => {
        setCurrentLocalization(localization);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentLocalization({ ...currentLocalization, Miejsc_1_Opis_1: e.target.value });
    };

    const getLocalizationList = async () => {
        try {
            const response = await axios.get(`/api/excel/localization/get-all-localizations`);
            return response.data.localizations || [];
        } catch (error) {
            console.error('Error fetching localizations:', error);
            return [];
        }
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current localizations to find next Miejsc_1_Kod_1
            const localizationList = await getLocalizationList();
            
            let nextCode;
            if (localizationList.length === 0) {
                // First row - start from 1
                nextCode = 1;
            } else {
                // Subsequent rows - increment from max
                const maxCode = Math.max(...localizationList.map(loc => Number(loc.Miejsc_1_Kod_1) || 0));
                nextCode = maxCode + 1;
            }

            // Create new localization
            const newLoc = {
                Miejsc_1_Kod_1: nextCode.toString(),
                Miejsc_1_Opis_1: ""
            };

            await axios.post('/api/excel/localization/insert-many-localizations', [newLoc]);
            
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

            // Check if the Miejsc_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/localization/get-all-localizations`);
            const localizations = response.data.localizations;
            const duplicate = localizations.find(localization => localization.Miejsc_1_Opis_1 === currentLocalization.Miejsc_1_Opis_1 && localization._id !== currentLocalization._id);

            if (duplicate && currentLocalization.Miejsc_1_Opis_1 !== "") {
                alert(`Wartość Miejsc_1_Opis_1 "${currentLocalization.Miejsc_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            const updateResponse = await axios.patch(`/api/excel/localization/update-localization/${currentLocalization._id}`, { Miejsc_1_Opis_1: currentLocalization.Miejsc_1_Opis_1 });

            fetchData();
            toggleModal();
        } catch (error) {
            // console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/localization/get-all-localizations`)).data;
            
            const localizations = Array.isArray(result.localizations) ? result.localizations : [];
            
            // Filtruj tylko te, które mają kod lokalizacji (opis może być pusty)
            const validLocalizations = localizations.filter(item => 
                item.Miejsc_1_Kod_1 && 
                item.Miejsc_1_Kod_1.toString().trim() !== ""
            );
            
            setRows(validLocalizations);
        } catch (error) {
            // Możesz włączyć console.log do debugowania błędów
            // console.log("Błąd przy pobieraniu danych:", error);
        } finally {
            setLoading(false);
        }
    };

    // Excel import functions removed - replaced with manual add functionality

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Miejsc_1_Kod_1</th>
                    <th>Miejsc_1_Opis_1</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id} >{item.Miejsc_1_Kod_1}</td>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id}>{item.Miejsc_1_Opis_1}</td>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id}>
                            <Button id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Lokalizacja
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="12" className={styles.textCenter}>
                            <div className={styles.buttonGroup}>
                                <Button disabled={loading} color="primary" size="sm" className={`${styles.button} ${styles.buttonAdd}`} onClick={addNewRow}>
                                    {"Dodaj nowy wiersz"}
                                </Button>
                                <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                            </div>
                        </Col>
                    </Row>
                    <div className={styles.textWhite} style={{ margin: '10px 0' }}>
                        Wyświetlanych rekordów: {rows.length}
                    </div>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Miejsc_1_Opis_1</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentLocalization.Miejsc_1_Opis_1}
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

export default Localization;
