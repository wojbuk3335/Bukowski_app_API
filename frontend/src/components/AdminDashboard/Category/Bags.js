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

const Bags = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentBagCategory, setCurrentBagCategory] = useState({ _id: '', Kat_1_Opis_1: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (bagCategory) => {
        setCurrentBagCategory(bagCategory);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentBagCategory({ ...currentBagCategory, Kat_1_Opis_1: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kat_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/bags-category/get-all-bags-categories`);
            const bagCategories = response.data.bagCategories;
            const duplicate = bagCategories.find(bagCategory => bagCategory.Kat_1_Opis_1 === currentBagCategory.Kat_1_Opis_1 && bagCategory._id !== currentBagCategory._id);

            if (duplicate && currentBagCategory.Kat_1_Opis_1 !== "") {
                alert(`Wartość Kat_1_Opis_1 "${currentBagCategory.Kat_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/bags-category/update-bags-category/${currentBagCategory._id}`, { Kat_1_Opis_1: currentBagCategory.Kat_1_Opis_1 });
            fetchData();
            toggleModal();
        } catch (error) {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

    const removeFile = async () => {
        try {
            setLoading(true);

            // Check if there are any records in the goods database with bags category
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            const bagsGoods = goodsResponse.data.goods.filter(good => good.category === 'Torebki');
            if (bagsGoods.length > 0) {
                alert("Nie można usunąć kategorii torebek ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty torebek i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete(`/api/excel/bags-category/delete-all-bags-categories`);
            resetState();
            alert("Dane zostały usunięte poprawnie.");
        } catch (error) {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/bags-category/get-all-bags-categories`)).data;
            setRows(Array.isArray(result.bagCategories) ? result.bagCategories : []);
        } catch (error) {
            // Error handling
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
                alert("Nie wczytano żadnych danych z pliku. Sprawdź czy plik zawiera dane w 8. arkuszu Excel.");
                return;
            }

            setLoading(true);

            // Check if there are any records in the goods database with bags category
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            const bagsGoods = goodsResponse.data.goods.filter(good => good.category === 'Torebki');
            if (bagsGoods.length > 0) {
                alert("Na bazie istniejących kategorii torebek zostały już stworzone produkty... Proszę usunąć wszystkie produkty torebek i spróbować ponownie");
                setLoading(false);
                return;
            }

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w ósmym arkuszu excela.");
                setLoading(false);
                return;
            }

            const bagCategoryList = await getBagCategoryList();
            if (bagCategoryList.length > 0) {
                alert("Tabela kategorii torebek nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                setLoading(false);
                return;
            }

            await insertOrUpdateBagCategories(bagCategoryList);

            fetchData();
        } catch (error) {
            // Error handling
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
                    
                    // Sprawdźmy arkusze które mogą zawierać dane torebek
                    const possibleSheets = [
                        { name: "Kategorie Torebki", index: workbook.SheetNames.indexOf("Kategorie Torebki") },
                        { name: "Torebki", index: workbook.SheetNames.indexOf("Torebki") },
                        { name: "Kategoia torebki skórzane", index: workbook.SheetNames.indexOf("Kategoia torebki skórzane") }
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
                        alert(`Nie znaleziono arkusza z danymi torebek. Dostępne arkusze: ${workbook.SheetNames.join(", ")}. Sprawdź czy któryś z arkuszy zawiera kolumny: ${requiredFields.join(", ")}`);
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

    const getBagCategoryList = async () => {
        const bagCategoryResponse = (await axios.get(`/api/excel/bags-category/get-all-bags-categories`)).data;
        return Array.isArray(bagCategoryResponse.bagCategories) ? bagCategoryResponse.bagCategories : [];
    };

    const insertOrUpdateBagCategories = async (bagCategoryList) => {
        const bagCategories = excelRows.map((obj) => ({
            _id: bagCategoryList.find((x) => x.Kat_1_Kod_1 === obj["Kat_1_Kod_1"])?._id,
            Kat_1_Kod_1: obj["Kat_1_Kod_1"] || "",
            Kat_1_Opis_1: obj["Kat_1_Opis_1"] || "",
            Plec: obj["Plec"] || "",
            number_id: Number(obj["Kat_1_Kod_1"]) || 0
        }));

        const updatedBagCategories = bagCategories.filter((x) => x._id);
        const newBagCategories = bagCategories.filter((x) => !x._id);

        if (updatedBagCategories.length) {
            const result = (await axios.post(`/api/excel/bags-category/update-many-bags-categories`, updatedBagCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedBagCategories.length + " rekordów.");
            }
        }

        if (newBagCategories.length) {
            const result = (await axios.post(`/api/excel/bags-category/insert-many-bags-categories`, newBagCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + newBagCategories.length + " rekordów.");
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
                    Kategorie Torebek
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="6" className={styles.textLeft}>
                            <FormGroup>
                                <div>
                                    <input className={styles.inputFile}
                                        id="inputBagsCategoryFile"
                                        name="file"
                                        type="file"
                                        onChange={readUploadFile}
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    />
                                </div>

                                <FormText className={styles.textWhite}>
                                    {"UWAGA: Nagłówki w Excelu powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
                                    {" (w arkuszu z danymi torebek)"}
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
                            value={currentBagCategory.Kat_1_Opis_1}
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