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
import styles from '../Sizes/Sizes.module.css'; // Use styles from Sizes.module.css

const requiredFields = ["Kat_1_Kod_1", "Kat_1_Opis_1", "Plec"];

const Category = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ _id: '', Kat_1_Opis_1: '', Plec: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (category) => {
        setCurrentCategory(category);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentCategory({ ...currentCategory, [e.target.name]: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            // Check if Kat_1_Opis_1 is unique
            const isDuplicate = rows.some(
                (row) => row.Kat_1_Opis_1 === currentCategory.Kat_1_Opis_1 && row._id !== currentCategory._id
            );
            if (isDuplicate) {
                alert(`Wartość "${currentCategory.Kat_1_Opis_1}" już istnieje. Proszę użyć unikalnej wartości.`);
                return;
            }

            setLoading(true);
            await axios.patch(`/api/excel/category/update-category/${currentCategory._id}`, {
                Kat_1_Opis_1: currentCategory.Kat_1_Opis_1,
                Plec: currentCategory.Plec
            });
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

            // Check if there are any goods in the database
            const goodsResult = (await axios.get("/api/excel/goods/get-all-goods")).data;
            if (goodsResult.goods && goodsResult.goods.length > 0) {
                alert("Nie można usunąć tabeli kategorii, ponieważ istnieją towary powiązane z kategoriami.");
                return;
            }

            await axios.delete("/api/excel/category/delete-all-categories");
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
            const result = (await axios.get("/api/excel/category/get-all-categories")).data;
            const sortedCategories = Array.isArray(result.categories) ? result.categories.sort((a, b) => a.Kat_1_Kod_1.localeCompare(b.Kat_1_Kod_1)) : [];
            setRows(sortedCategories);
        } catch (error) {
            console.error("Error fetching data:", error); // Log errors for debugging
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

            setLoading(true);

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w czwartym arkuszu excela.");
                return;
            }

            // Filter out rows with missing required fields
            const validRows = excelRows.filter(row =>
                row.Kat_1_Kod_1 && row.Kat_1_Opis_1 && row.Plec
            );

            if (validRows.length === 0) {
                alert("Brak prawidłowych danych do załadowania. Proszę sprawdzić plik.");
                setLoading(false);
                return;
            }

            const response = await axios.post("/api/excel/category/insert-many-categories", validRows);
            if (response.status === 201) {
                setRows((prevRows) => [...prevRows, ...response.data.categories]); // Update rows immediately
                alert("Dane zostały załadowane pomyślnie.");
            }
        } catch (error) {
            console.error("Error uploading data:", error); // Log errors for debugging
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log("Data:", error.response.data);
                console.log("Status:", error.response.status);
                console.log("Headers:", error.response.headers);

                if (error.response.status === 400 && error.response.data && error.response.data.message === "Duplicate Kat_1_Kod_1 values in database") {
                    alert("Wykryto duplikaty w kolumnie 'Kat_1_Kod_1'. Proszę poprawić dane w pliku Excel i spróbować ponownie.");
                } else {
                    alert(`Wystąpił błąd podczas przesyłania danych. Status: ${error.response.status}. Szczegóły w konsoli.`);
                }

            } else if (error.request) {
                // The request was made but no response was received
                console.log(error.request);
                alert("Wystąpił błąd podczas przesyłania danych. Brak odpowiedzi z serwera.");
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
                alert(`Wystąpił błąd podczas przesyłania danych. Błąd: ${error.message}`);
            }
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
                    const sheetName = workbook.SheetNames[3]; // Fourth sheet
                    const worksheet = workbook.Sheets[sheetName];
                    const json = utils.sheet_to_json(worksheet, { defval: "" }); // Ensure empty cells are included
                    setExcelRows(json); // Set all rows from the sheet
                } catch (error) {
                    alert("Wystąpił błąd podczas przetwarzania pliku. Proszę spróbować ponownie.");
                    console.log(error);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const validateRequiredFields = () => {
        const firstItemKeys = excelRows[0] && Object.keys(excelRows[0]);
        if (firstItemKeys.length) {
            return requiredFields.every((field) => firstItemKeys.includes(field));
        }
        return false;
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
                    Kategorie
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
                                    {"UWAGA: Nagłówki w Excelu powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
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
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Kategorię</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            name="Kat_1_Opis_1"
                            value={currentCategory.Kat_1_Opis_1}
                            onChange={handleUpdateChange}
                            placeholder="Opis kategorii"
                        />
                        <Input
                            type="text"
                            name="Plec"
                            value={currentCategory.Plec}
                            onChange={handleUpdateChange}
                            placeholder="Płeć"
                            className="mt-2"
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

export default Category;

