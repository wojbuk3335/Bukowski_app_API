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
import styles from './Bags.module.css';

const Bags = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentWallet, setCurrentWallet] = useState({ _id: '', Torebki_Kod: '' });
    const [startingNumber, setStartingNumber] = useState(1000);

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (wallet) => {
        setCurrentWallet(wallet);
        toggleModal();
    };

    const validateTorebkiKod = (value) => {
        // Allow empty string
        if (value === '') return value;
        
        // Check if value contains a decimal point
        if (value.includes('.')) {
            const parts = value.split('.');
            // If there's more than one decimal point, return the current value
            if (parts.length > 2) return currentWallet.Torebki_Kod;
            
            // Limit decimal places to maximum 3 digits
            if (parts[1] && parts[1].length > 3) {
                return parts[0] + '.' + parts[1].slice(0, 3);
            }
        }
        
        return value;
    };

    const handleUpdateChange = (e) => {
        const validatedValue = validateTorebkiKod(e.target.value);
        setCurrentWallet({ ...currentWallet, Torebki_Kod: validatedValue });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Tow_Kod value is unique
            const response = await axios.get(`/api/excel/bags/get-all-bags`);
            const wallets = response.data.bags;
            const duplicate = wallets.find(wallet => wallet.Torebki_Kod === currentWallet.Torebki_Kod && wallet._id !== currentWallet._id);

            if (duplicate && currentWallet.Torebki_Kod !== "") {
                alert(`Wartość Torebki_Kod "${currentWallet.Torebki_Kod}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/bags/update-bags/${currentWallet._id}`, { Torebki_Kod: currentWallet.Torebki_Kod });
            fetchData();
            toggleModal();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartingNumberChange = (e) => {
        const value = parseInt(e.target.value) || 1000;
        setStartingNumber(value);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/bags/get-all-bags`)).data;
            // Sort in descending order - newest (highest number) on top
            const sortedWallets = Array.isArray(result.bags) ? result.bags.sort((a, b) => Number(b.Torebki_Nr) - Number(a.Torebki_Nr)) : [];
            setRows(sortedWallets);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current bags to find next Torebki_Nr
            const walletList = await getWalletList();
            
            let nextTorebkiNr;
            if (walletList.length === 0) {
                // First row - use starting number, ale sprawdź czy jest w zakresie
                if (startingNumber < 1000 || startingNumber > 9999) {
                    alert("Numer początkowy musi być w zakresie 1000-9999.");
                    setLoading(false);
                    return;
                }
                nextTorebkiNr = startingNumber;
            } else {
                // Subsequent rows - increment from max
                const maxTorebkiNr = Math.max(...walletList.map(wallet => Number(wallet.Torebki_Nr) || 0));
                nextTorebkiNr = maxTorebkiNr + 1;
            }

            // Check if we reached the limit (max 9999 positions)
            if (nextTorebkiNr > 9999) {
                alert("Osiągnięto maksymalną liczbę torebek (9999). Nie można dodać więcej wierszy.");
                setLoading(false);
                return;
            }

            // Create new bag
            const newWallet = {
                Torebki_Nr: nextTorebkiNr,
                Torebki_Kod: ""
            };

            await axios.post('/api/excel/bags/insert-bags', [newWallet]);
            
            fetchData();
        } catch (error) {
            console.log(error);
            alert("Błąd podczas dodawania nowego wiersza");
        } finally {
            setLoading(false);
        }
    };

    const getWalletList = async () => {
        try {
            const url = `/api/excel/bags/get-all-bags`;
            const walletResponse = (await axios.get(url)).data;
            return Array.isArray(walletResponse.bags) ? walletResponse.bags : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Torebki_Nr</th>
                    <th>Torebki_Kod</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Torebki_Nr} id={item._id}>{item.Torebki_Nr}</td>
                        <td id_from_excel_column={item.Torebki_Nr} id={item._id}>{item.Torebki_Kod}</td>
                        <td id_from_excel_column={item.Torebki_Nr} id={item._id}>
                            <Button id_from_excel_column={item.Torebki_Nr} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Torebki
                </h3>
                <div className={styles.container}>
                    {rows.length === 0 && (
                        <Row className={styles.xxx}>
                            <Col md="12" className={styles.textCenter}>
                                <FormGroup>
                                    <label className={styles.textWhite} style={{ marginBottom: '10px', display: 'block' }}>
                                        Numer początkowy (od którego zacząć liczenie):
                                    </label>
                                    <Input
                                        type="number"
                                        min="1000"
                                        max="9999"
                                        value={startingNumber}
                                        onChange={handleStartingNumberChange}
                                        style={{ 
                                            width: '100px', 
                                            margin: '0 auto 20px auto',
                                            backgroundColor: 'black',
                                            color: 'white',
                                            border: '1px solid white'
                                        }}
                                    />
                                    <div className={styles.textWhite} style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
                                        Liczenie będzie od {startingNumber} do 9999 (max {9999 - startingNumber + 1} pozycji)
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                    )}
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
                    {renderDataTable()}
                </div>
            </Fragment>

            {/* Modal dla edycji */}
            <Modal 
                isOpen={modal} 
                toggle={toggleModal}
                contentClassName="bg-dark text-white border-white"
                style={{ 
                    '--bs-modal-bg': 'black',
                    '--bs-modal-header-bg': 'black',
                    '--bs-modal-body-bg': 'black',
                    '--bs-modal-footer-bg': 'black'
                }}
            >
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>
                    Aktualizuj Torebki_Kod
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentWallet.Torebki_Kod}
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

export default Bags;