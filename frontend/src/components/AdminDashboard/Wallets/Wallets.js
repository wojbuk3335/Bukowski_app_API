import React, { Fragment, useEffect, useState } from "react";
import { read, utils } from "xlsx";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Table,
    FormText,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './Wallets.module.css';

const Wallets = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [requiredFields, setRequiredFields] = useState(["Portfele_Nr", "Portfele_Kod"]); // Require both fields
    const [modal, setModal] = useState(false);
    const [currentWallet, setCurrentWallet] = useState({ _id: '', Portfele_Kod: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (wallet) => {
        setCurrentWallet(wallet);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentWallet({ ...currentWallet, Portfele_Kod: e.target.value });
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

    const removeFile = async () => {
        try {
            setLoading(true);

            await axios.delete(`/api/excel/wallets/delete-all-wallets`);
            resetState();
            alert("Dane zostały usunięte poprawnie.");
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
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

    const uploadData = async () => {
        try {
            if (!selectedFile) {
                alert("Proszę wybrać plik do załadowania nagłówków.");
                return;
            }

            setLoading(true);

            const walletList = await getWalletList();
            if (walletList.length > 0) {
                alert("Tabela portfeli nie jest pusta. Proszę usunąć wszystkie dane aby rozpocząć od nowa.");
                setLoading(false);
                return;
            }

            // Headers are already validated in readUploadFile
            alert("Nagłówki zostały zweryfikowane. Tabela jest gotowa. Dodawaj wiersze używając przycisku 'Dodaj nowy wiersz'.");
            fetchData();
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
            const maxPortfeleNr = walletList.length > 0 
                ? Math.max(...walletList.map(wallet => Number(wallet.Portfele_Nr) || 0))
                : 99; // Start from 99 so first wallet will be 100

            const nextPortfeleNr = maxPortfeleNr + 1;

            // Check if we reached the limit
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

    const readUploadFile = (e) => {
        e.preventDefault();
        if (e.target.files) {
            const file = e.target.files[0];
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = read(data, { type: "array" });
                    
                    const sheetName = workbook.SheetNames[6]; // Seventh sheet (index 6) - Portfele
                    if (!sheetName) {
                        alert("Plik nie zawiera siódmego arkusza (Portfele). Proszę sprawdzić plik Excel.");
                        return;
                    }
                    const worksheet = workbook.Sheets[sheetName];
                    const json = utils.sheet_to_json(worksheet);
                    
                    // Only validate headers exist, don't load data
                    if (json.length > 0) {
                        const headers = Object.keys(json[0]);
                        
                        // Try to match headers with trimmed spaces
                        const trimmedHeaders = headers.map(h => h.trim());
                        const hasRequiredHeaders = requiredFields.every(field => 
                            trimmedHeaders.includes(field) || headers.includes(field)
                        );
                        
                        if (hasRequiredHeaders) {
                            // Set empty array - we'll add rows manually
                            setExcelRows([]);
                            alert("Nagłówki zostały zweryfikowane. Możesz teraz dodawać wiersze używając przycisku 'Dodaj nowy wiersz'.");
                        } else {
                            alert(`Brak wymaganych nagłówków.\nZnalezione: [${headers.join(', ')}]\nWymagane: [${requiredFields.join(', ')}]`);
                        }
                    } else {
                        alert("Arkusz jest pusty lub nie zawiera danych.");
                    }
                } catch (error) {
                    handleFileReadError(error);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const validateRequiredFields = () => {
        if (!excelRows || excelRows.length === 0) {
            return false;
        }
        
        const firstItemKeys = Object.keys(excelRows[0]);
        
        if (firstItemKeys.length) {
            const hasAllFields = requiredFields.every((field) => firstItemKeys.includes(field));
            return hasAllFields;
        }
        return false;
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

    const insertOrUpdateWallets = async (walletList) => {
        // Filtruj tylko te rekordy, które mają przynajmniej numer portfela
        // Kod towaru może być pusty - będzie można go później edytować
        const validRows = excelRows.filter(obj => 
            obj["Portfele_Nr"] && 
            obj["Portfele_Nr"].toString().trim() !== ""
        );
        
        const wallets = validRows.map((obj) => ({
            _id: walletList.find((x) => x.Portfele_Nr === obj["Portfele_Nr"])?._id,
            Portfele_Nr: obj["Portfele_Nr"].toString().trim(),
            Portfele_Kod: obj["Portfele_Kod"] ? obj["Portfele_Kod"].toString().trim() : "", // Pozwól na puste kody towarów
            number_id: Number(obj["Portfele_Nr"]) || 0
        }));

        const updatedWallets = wallets.filter((x) => x._id);
        const newWallets = wallets.filter((x) => !x._id);

        if (updatedWallets.length) {
            const result = (await axios.post(`/api/excel/wallets/update-many-wallets`, updatedWallets)).data;
            if (result) {
                alert("Zaktualizowano pomyślnie " + updatedWallets.length + " rekordów.");
            }
        }

        if (newWallets.length) {
            const result = (await axios.post(`/api/excel/wallets/insert-wallets`, newWallets)).data;
            if (result) {
                alert("Dodano pomyślnie " + newWallets.length + " nowych rekordów.");
            }
        }

        if (validRows.length === 0) {
            alert("Nie znaleziono prawidłowych danych w pliku Excel. Sprawdź czy dane są w 7. arkuszu i czy zawierają wymagane kolumny.");
        }
    };

    const handleFileReadError = (error) => {
        if (error.message.includes("File is password-protected")) {
            alert("Plik jest chroniony hasłem. Proszę wybrać inny plik.");
        } else {
            alert("Wystąpił błąd podczas przetwarzania pliku. Proszę spróbować ponownie.");
            console.log(error);
        }
    };

    const resetState = () => {
        setSelectedFile(null);
        setExcelRows([]);
        fetchData();
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
                    <Row className={styles.xxx}>
                        <Col md="6" className={styles.textLeft}>
                            <FormGroup>
                                <div>
                                    <input className={styles.inputFile}
                                        id="inputEmpGroupFile"
                                        name="file"
                                        type="file"
                                        onChange={readUploadFile}
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    />
                                </div>

                                <FormText className={styles.textWhite}>
                                    {"UWAGA: Nagłówki w Excelu (7. arkusz) powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
                                    {" (Numery portfeli: 100-999)"}
                                </FormText>
                            </FormGroup>
                        </Col>
                        <Col md="6" className={styles.textRight}>
                            <div className={styles.buttonGroup}>
                                <Button disabled={loading} color="success" size="sm" className={`${styles.button} ${styles.UploadButton}`} onClick={uploadData}>
                                    {"Weryfikuj nagłówki"}
                                </Button>
                                <Button disabled={loading} color="danger" size="sm" className={`${styles.button} ${styles.RemoveFiles}`} onClick={removeFile}>
                                    {"Usuń dane z bazy danych"}
                                </Button>
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