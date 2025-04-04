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
import styles from './Jacketscoatsfurs.module.css';

const requiredFields = ["Kat_1_Kod_1", "Kat_1_Opis_1", "Plec"];

const Jacketscoatsfurs = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentItem, setCurrentItem] = useState({ _id: '', Kat_1_Opis_1: '', Plec: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (item) => {
        setCurrentItem(item);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            const response = await axios.get(`/api/excel/jacketscoatsfurs/get-all`);
            const items = response.data.items;
            const duplicate = items.find(item => item.Kat_1_Opis_1 === currentItem.Kat_1_Opis_1 && item._id !== currentItem._id);

            if (duplicate && currentItem.Kat_1_Opis_1 !== "") {
                alert(`Wartość Kat_1_Opis_1 "${currentItem.Kat_1_Opis_1}" już istnieje w bazie danych.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/jacketscoatsfurs/update/${currentItem._id}`, {
                Kat_1_Opis_1: currentItem.Kat_1_Opis_1,
                Plec: currentItem.Plec
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
            await axios.delete(`/api/excel/jacketscoatsfurs/delete-all`);
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
            const result = (await axios.get(`http://localhost:3001/api/excel/jacketscoatsfurs/get-all`)).data;
            const sortedItems = Array.isArray(result.items) ? result.items.sort((a, b) => a.Kat_1_Kod_1.localeCompare(b.Kat_1_Kod_1)) : [];
            setRows(sortedItems);
        } catch (error) {
            console.error("Error fetching data:", error);
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
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w pierwszym arkuszu excela.");
                return;
            }

            const itemList = await getItemList();
            if (itemList.length > 0) {
                alert("Tabela nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateItems(itemList);

            fetchData();
        } catch (error) {
            console.log(error);
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
                    const json = utils.sheet_to_json(worksheet);
                    setExcelRows(json);
                } catch (error) {
                    handleFileReadError(error);
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

    const getItemList = async () => {
        try {
            const url = `/api/excel/jacketscoatsfurs/get-all`;
            const response = (await axios.get(url)).data;
            return Array.isArray(response.items) ? response.items : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const insertOrUpdateItems = async (itemList) => {
        const items = excelRows.map((obj) => ({
            _id: itemList.find((x) => x.Kat_1_Kod_1 === obj["Kat_1_Kod_1"])?._id,
            Kat_1_Kod_1: obj["Kat_1_Kod_1"] || "",
            Kat_1_Opis_1: obj["Kat_1_Opis_1"] || "",
            Plec: obj["Plec"] || "",
        }));

        const updatedItems = items.filter((x) => x._id);
        const newItems = items.filter((x) => !x._id);

        if (updatedItems.length) {
            await axios.post(`/api/excel/jacketscoatsfurs/update-many`, updatedItems);
        }

        if (newItems.length) {
            await axios.post(`/api/excel/jacketscoatsfurs/insert-many`, newItems);
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

    return (
        <div>
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Kurtki, Płaszcze, Futra
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
                                    {"UWAGA: Nagłówki w Excelu powinny być następujące!. => " + requiredFields.join(", ")}
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
                    {loading && <progress className={styles.progress}></progress>}
                    <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Dane</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            name="Kat_1_Opis_1"
                            value={currentItem.Kat_1_Opis_1}
                            onChange={handleUpdateChange}
                            className="my-2" // Added margin top and bottom
                        />
                        <Input
                            type="text"
                            name="Plec"
                            value={currentItem.Plec}
                            onChange={handleUpdateChange}
                            className="my-2" // Added margin top and bottom
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

export default Jacketscoatsfurs;