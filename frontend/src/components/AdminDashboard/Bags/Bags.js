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
import styles from './Bags.module.css';

const Bags = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [requiredFields, setRequiredFields] = useState(["Torebki_Nr", "Torebki_Kod"]); // Require both fields
    const [modal, setModal] = useState(false);
    const [currentWallet, setCurrentWallet] = useState({ _id: '', Torebki_Kod: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (wallet) => {
        setCurrentWallet(wallet);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentWallet({ ...currentWallet, Torebki_Kod: e.target.value });
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

    const removeFile = async () => {
        try {
            setLoading(true);

            await axios.delete(`/api/excel/bags/delete-all-bags`);
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
            const result = (await axios.get(`/api/excel/bags/get-all-bags`)).data;
            const sortedWallets = Array.isArray(result.bags) ? result.bags.sort((a, b) => Number(a.Torebki_Nr) - Number(b.Torebki_Nr)) : [];
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
                alert("Tabela torebek nie jest pusta. Proszę usunąć wszystkie dane aby rozpocząć od nowa.");
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

            // Get current wallets to find next Torebki_Nr
            const walletList = await getWalletList();
            const maxTorebkiNr = walletList.length > 0 
                ? Math.max(...walletList.map(wallet => Number(wallet.Torebki_Nr) || 0))
                : 0;
            
            const nextTorebkiNr = maxTorebkiNr + 1;

            // Create new wallet
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
                    
                    const sheetName = workbook.SheetNames[5]; // Sixth sheet (index 5) - Torebki
                    if (!sheetName) {
                        alert("Plik nie zawiera szóstego arkusza (Torebki). Proszę sprawdzić plik Excel.");
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
            const url = `/api/excel/bags/get-all-bags`;
            const walletResponse = (await axios.get(url)).data;
            return Array.isArray(walletResponse.bags) ? walletResponse.bags : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const insertOrUpdateWallets = async (walletList) => {
        // Filtruj tylko te rekordy, które mają przynajmniej numer torebki
        // Kod towaru może być pusty - będzie można go później edytować
        const validRows = excelRows.filter(obj => 
            obj["Torebki_Nr"] && 
            obj["Torebki_Nr"].toString().trim() !== ""
        );
        
        const wallets = validRows.map((obj) => ({
            _id: walletList.find((x) => x.Torebki_Nr === obj["Torebki_Nr"])?._id,
            Torebki_Nr: obj["Torebki_Nr"].toString().trim(),
            Tow_Kod: obj["Tow_Kod"] ? obj["Tow_Kod"].toString().trim() : "", // Pozwól na puste kody towarów
            number_id: Number(obj["Torebki_Nr"]) || 0
        }));

        const updatedWallets = wallets.filter((x) => x._id);
        const newWallets = wallets.filter((x) => !x._id);

        if (updatedWallets.length) {
            const result = (await axios.post(`/api/excel/bags/update-many-bags`, updatedWallets)).data;
            if (result) {
                alert("Zaktualizowano pomyślnie " + updatedWallets.length + " rekordów.");
            }
        }

        if (newWallets.length) {
            const result = (await axios.post(`/api/excel/bags/insert-bags`, newWallets)).data;
            if (result) {
                alert("Dodano pomyślnie " + newWallets.length + " nowych rekordów.");
            }
        }

        if (validRows.length === 0) {
            alert("Nie znaleziono prawidłowych danych w pliku Excel. Sprawdź czy dane są w 5. arkuszu i czy zawierają wymagane kolumny.");
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
                                    {"UWAGA: Nagłówki w Excelu (5. arkusz) powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
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
                                <Button disabled={loading} color="primary" size="sm" className={`${styles.button} ${styles.buttonRefresh}`} onClick={addNewRow}>
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