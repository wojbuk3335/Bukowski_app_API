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
import styles from './Wallets.module.css';

const Wallets = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentWallet, setCurrentWallet] = useState({ _id: '', Portfele_Kod: '' });
    const [startingNumber, setStartingNumber] = useState(100);

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (wallet) => {
        setCurrentWallet(wallet);
        toggleModal();
    };

    const validatePortfeleKod = (value) => {
        // Allow empty string
        if (value === '') return value;
        
        // Check if value contains a decimal point
        if (value.includes('.')) {
            const parts = value.split('.');
            // If there's more than one decimal point, return the current value
            if (parts.length > 2) return currentWallet.Portfele_Kod;
            
            // Limit decimal places to maximum 3 digits
            if (parts[1] && parts[1].length > 3) {
                return parts[0] + '.' + parts[1].slice(0, 3);
            }
        }
        
        return value;
    };

    const handleUpdateChange = (e) => {
        const validatedValue = validatePortfeleKod(e.target.value);
        setCurrentWallet({ ...currentWallet, Portfele_Kod: validatedValue });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Portfele_Kod value is unique
            const response = await axios.get(`/api/excel/wallets/get-all-wallets`);
            const wallets = response.data.wallets;
            const duplicate = wallets.find(wallet => wallet.Portfele_Kod === currentWallet.Portfele_Kod && wallet._id !== currentWallet._id);

            if (duplicate && currentWallet.Portfele_Kod !== "") {
                alert(`Wartość Portfele_Kod "${currentWallet.Portfele_Kod}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/wallets/update-wallets/${currentWallet._id}`, { Portfele_Kod: currentWallet.Portfele_Kod });
            fetchData();
            toggleModal();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartingNumberChange = (e) => {
        const value = parseInt(e.target.value);
        // Ensure minimum value is 100
        if (value < 100) {
            setStartingNumber(100);
        } else {
            setStartingNumber(value || 100);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/wallets/get-all-wallets`)).data;
            // Sort in descending order - newest (highest number) on top
            const sortedWallets = Array.isArray(result.wallets) ? result.wallets.sort((a, b) => Number(b.Portfele_Nr) - Number(a.Portfele_Nr)) : [];
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

            // Get current wallets to find next Portfele_Nr
            const walletList = await getWalletList();
            
            let nextPortfeleNr;
            if (walletList.length === 0) {
                // First row - use starting number, ale sprawdź czy jest w zakresie
                if (startingNumber < 100 || startingNumber > 999) {
                    alert("Numer początkowy musi być w zakresie 100-999.");
                    setLoading(false);
                    return;
                }
                nextPortfeleNr = startingNumber;
            } else {
                // Subsequent rows - increment from max
                const maxPortfeleNr = Math.max(...walletList.map(wallet => Number(wallet.Portfele_Nr) || 0));
                nextPortfeleNr = maxPortfeleNr + 1;
            }

            // Check if we reached the limit (max 999 positions)
            if (nextPortfeleNr > 999) {
                alert("Osiągnięto maksymalną liczbę portfeli (999). Nie można dodać więcej wierszy.");
                setLoading(false);
                return;
            }

            // Create new wallet
            const newWallet = {
                Portfele_Nr: nextPortfeleNr,
                Portfele_Kod: ""
            };

            await axios.post('/api/excel/wallets/insert-wallets', [newWallet]);
            
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
            const url = `/api/excel/wallets/get-all-wallets`;
            const walletResponse = (await axios.get(url)).data;
            return Array.isArray(walletResponse.wallets) ? walletResponse.wallets : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Portfele_Nr</th>
                    <th>Portfele_Kod</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Portfele_Nr} id={item._id}>{item.Portfele_Nr}</td>
                        <td id_from_excel_column={item.Portfele_Nr} id={item._id}>{item.Portfele_Kod}</td>
                        <td id_from_excel_column={item.Portfele_Nr} id={item._id}>
                            <Button id_from_excel_column={item.Portfele_Nr} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Portfele
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
                                        min="100"
                                        max="999"
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
                                        Liczenie będzie od {startingNumber} do 999 (max {999 - startingNumber + 1} pozycji)
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
                    Aktualizuj Portfele_Kod
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentWallet.Portfele_Kod}
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

export default Wallets;