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
import styles from './Category.module.css';

const requiredFields = ["Kat_1_Kod_1", "Kat_1_Opis_1", "Plec"];

const Wallets = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentWalletCategory, setCurrentWalletCategory] = useState({ _id: '', Kat_1_Opis_1: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (walletCategory) => {
        setCurrentWalletCategory(walletCategory);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentWalletCategory({ ...currentWalletCategory, Kat_1_Opis_1: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kat_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`);
            const walletCategories = response.data.walletCategories;
            const duplicate = walletCategories.find(walletCategory => walletCategory.Kat_1_Opis_1 === currentWalletCategory.Kat_1_Opis_1 && walletCategory._id !== currentWalletCategory._id);

            if (duplicate && currentWalletCategory.Kat_1_Opis_1 !== "") {
                alert(`Wartość Kat_1_Opis_1 "${currentWalletCategory.Kat_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/wallets-category/update-wallets-category/${currentWalletCategory._id}`, { Kat_1_Opis_1: currentWalletCategory.Kat_1_Opis_1 });
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

            // Check if there are any records in the goods database with wallets category
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            const walletsGoods = goodsResponse.data.goods.filter(good => good.category === 'Portfele');
            if (walletsGoods.length > 0) {
                alert("Nie można usunąć kategorii portfeli ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty portfeli i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete(`/api/excel/wallets-category/delete-all-wallets-categories`);
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
            const result = (await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`)).data;
            setRows(Array.isArray(result.walletCategories) ? result.walletCategories : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const uploadData = async () => {
        try {
            if (!selectedFile) {
                alert("Proszę wybrać plik do załadowania danych.");
                return;
            }

            if (!excelRows || excelRows.length === 0) {
                alert("Nie wczytano żadnych danych z pliku. Sprawdź czy plik zawiera dane w arkuszu Excel.");
                return;
            }

            setLoading(true);

            // Check if there are any records in the goods database with wallets category
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            const walletsGoods = goodsResponse.data.goods.filter(good => good.category === 'Portfele');
            if (walletsGoods.length > 0) {
                alert("Na bazie istniejących kategorii portfeli zostały już stworzone produkty... Proszę usunąć wszystkie produkty portfeli i spróbować ponownie");
                setLoading(false);
                return;
            }

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w arkuszu excela.");
                setLoading(false);
                return;
            }

            const walletCategoryList = await getWalletCategoryList();
            if (walletCategoryList.length > 0) {
                alert("Tabela kategorii portfeli nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                setLoading(false);
                return;
            }

            await insertOrUpdateWalletCategories([]);

            fetchData();
        } catch (error) {
            console.error(error);
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
                    
                    // Sprawdźmy arkusze które mogą zawierać dane portfeli
                    const possibleSheets = [
                        { name: "Podkategoria portfele", index: workbook.SheetNames.indexOf("Podkategoria portfele") },
                        { name: "Portfele", index: workbook.SheetNames.indexOf("Portfele") },
                        { name: "Kategorie Portfele", index: workbook.SheetNames.indexOf("Kategorie Portfele") },
                        { name: "Kategoria portfele skórzane", index: workbook.SheetNames.indexOf("Kategoria portfele skórzane") }
                    ].filter(sheet => sheet.index !== -1);
                    
                    let selectedSheet = null;
                    let json = [];
                    
                    // Sprawdź każdy możliwy arkusz w poszukiwaniu danych
                    for (const sheet of possibleSheets) {
                        const worksheet = workbook.Sheets[sheet.name];
                        const tempJson = utils.sheet_to_json(worksheet, { defval: null, raw: true });
                        
                        if (tempJson.length > 0) {
                            // Sprawdź czy ma wymagane kolumny
                            const keys = Object.keys(tempJson[0] || {});
                            const hasRequiredFields = requiredFields.every(field => keys.includes(field));
                            
                            if (hasRequiredFields) {
                                selectedSheet = sheet;
                                json = tempJson;
                                break;
                            }
                        }
                    }
                    
                    if (!selectedSheet) {
                        alert(`Nie znaleziono arkusza z danymi portfeli. Dostępne arkusze: ${workbook.SheetNames.join(", ")}. Sprawdź czy arkusz "Podkategoria portfele" zawiera kolumny: ${requiredFields.join(", ")}.`);
                        setExcelRows([]);
                        return;
                    }

                    // Wczytaj wszystkie wiersze, które mają kod (łącznie z pustymi opisami i płcią)
                    const filteredRows = json.filter(row => 
                        row["Kat_1_Kod_1"] != null && row["Kat_1_Kod_1"].toString().trim() !== ""
                    );
                    
                    if (filteredRows.length === 0) {
                        alert(`Arkusz "${selectedSheet.name}" nie zawiera żadnych danych w kolumnie 'Kat_1_Kod_1'. Sprawdź czy nagłówki kolumn to: Kat_1_Kod_1, Kat_1_Opis_1, Plec`);
                        return;
                    }
                    
                    setExcelRows(filteredRows);
                } catch (error) {
                    console.error("Błąd podczas wczytywania pliku:", error);
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
        const firstItemKeys = excelRows[0] && Object.keys(excelRows[0]);
        if (firstItemKeys && firstItemKeys.length) {
            return requiredFields.every((field) => firstItemKeys.includes(field));
        }
        return false;
    };

    const getWalletCategoryList = async () => {
        const walletCategoryResponse = (await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`)).data;
        return Array.isArray(walletCategoryResponse.walletCategories) ? walletCategoryResponse.walletCategories : [];
    };

    const insertOrUpdateWalletCategories = async (walletCategoryList) => {
        // Filtruj prawidłowe rekordy (z niepustym Kat_1_Kod_1)
        const validExcelRows = excelRows.filter(obj => {
            const kod = String(obj["Kat_1_Kod_1"] || "").trim();
            return kod !== "" && kod !== "Kat_1_Kod_1"; // odfiltruj nagłówki i puste
        });

        const walletCategories = validExcelRows.map((obj) => ({
            _id: walletCategoryList.find((x) => x.Kat_1_Kod_1 === String(obj["Kat_1_Kod_1"]))?._id,
            Kat_1_Kod_1: String(obj["Kat_1_Kod_1"]),
            Kat_1_Opis_1: String(obj["Kat_1_Opis_1"] || ""),
            Plec: String(obj["Plec"] || ""),
            number_id: Number(obj["Kat_1_Kod_1"]) || 0
        }));

        const updatedWalletCategories = walletCategories.filter((x) => x._id);
        const newWalletCategories = walletCategories.filter((x) => !x._id);

        if (updatedWalletCategories.length) {
            const result = (await axios.post(`/api/excel/wallets-category/update-many-wallets-categories`, updatedWalletCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedWalletCategories.length + " rekordów.");
            }
        }

        if (newWalletCategories.length) {
            const result = (await axios.post(`/api/excel/wallets-category/insert-many-wallets-categories`, newWalletCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + newWalletCategories.length + " rekordów.");
            }
        }
    };

    const handleFileReadError = (error) => {
        if (error.message.includes("File is password-protected")) {
            alert("Plik jest chroniony hasłem. Proszę wybrać inny plik.");
        } else {
            alert("Wystąpił błąd podczas przetwarzania pliku. Proszę spróbować ponownie.");
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
                    <th>Kat_1_Kod_1</th>
                    <th>Kat_1_Opis_1</th>
                    <th>Plec</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td>{item.Kat_1_Kod_1}</td>
                        <td>{item.Kat_1_Opis_1}</td>
                        <td>{item.Plec}</td>
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
                    Kategorie Portfeli
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="6" className={styles.textLeft}>
                            <FormGroup>
                                <div>
                                    <input className={styles.inputFile}
                                        id="inputWalletsCategoryFile"
                                        name="file"
                                        type="file"
                                        onChange={readUploadFile}
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    />
                                </div>

                                <FormText className={styles.textWhite}>
                                    {"UWAGA: Nagłówki w Excelu powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
                                    {" (w arkuszu 'Podkategoria portfele')"}
                                </FormText>
                            </FormGroup>
                        </Col>
                        <Col md="6" className={styles.textRight}>
                            <Button disabled={loading} color="success" size="sm" className={`${styles.button} ${styles.UploadButton}`} onClick={uploadData}>
                                {"Wczytaj dane z pliku"}
                            </Button>
                            <Button disabled={loading} color="danger" size="sm" className={`${styles.button} ${styles.RemoveFiles}`} onClick={removeFile}>
                                {"Usuń dane z bazy danych"}
                            </Button>
                        </Col>
                    </Row>
                    <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Kat_1_Opis_1</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentWalletCategory.Kat_1_Opis_1}
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