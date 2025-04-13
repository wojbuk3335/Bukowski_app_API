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
import styles from './Colors.module.css';

const requiredFields = ["Kol_Kod", "Kol_Opis"];

const Colors = () => {

    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentColor, setCurrentColor] = useState({ _id: '', Kol_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (color) => {
        setCurrentColor(color);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentColor({ ...currentColor, Kol_Opis: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kol_Opis value is unique
            const response = await axios.get(`/api/excel/color/get-all-colors`);
            const colors = response.data.colors;
            const duplicate = colors.find(color => color.Kol_Opis === currentColor.Kol_Opis && color._id !== currentColor._id);

            if (duplicate && currentColor.Kol_Opis !== "") {
                alert(`Wartość Kol_Opis "${currentColor.Kol_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/color/update-color/${currentColor._id}`, { Kol_Opis: currentColor.Kol_Opis });
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

            // Check if there are any records in the goods database
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            if (goodsResponse.data.goods.length > 0) {
                alert("Nie można usunąć kolorów ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete(`/api/excel/color/delete-all-colors`);
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
            const result = (await axios.get(`/api/excel/color/get-all-colors`)).data;
            const sortedColors = Array.isArray(result.colors) ? result.colors.sort((a, b) => a.Kol_Kod.localeCompare(b.Kol_Kod)) : [];
            setRows(sortedColors);
        } catch (error) {
            console.log(error);
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

            // Check if there are any records in the goods database
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            if (goodsResponse.data.goods.length > 0) {
                alert("Na bazie istaniejego asortymentu zostały już stworzone produkty... Proszę usunąć wszystkie produkty i spróbować ponownie");
                setLoading(false);
                return;
            }

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w pierwszym arkuszu excela.");
                return;
            }

            const colorList = await getColorList();
            if (colorList.length > 0) {
                alert("Tabela kolorów nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateColors(colorList);

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
                    const sheetName = workbook.SheetNames[1]; // Second sheet
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

    const getColorList = async () => {
        try {
            const url = `/api/excel/color/get-all-colors`;
            const colorResponse = (await axios.get(url)).data;
            return Array.isArray(colorResponse.colors) ? colorResponse.colors : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const insertOrUpdateColors = async (colorList) => {
        const colors = excelRows.map((obj) => ({
            _id: colorList.find((x) => x.Kol_Kod === obj["Kol_Kod"])?._id,
            Kol_Kod: obj["Kol_Kod"] || "",
            Kol_Opis: obj["Kol_Opis"] || "",
            number_id: Number(obj["Kol_Kod"]) || 0
        }));

        const updatedColors = colors.filter((x) => x._id);
        const newColors = colors.filter((x) => !x._id);

        if (updatedColors.length) {
            const result = (await axios.post(`/api/excel/color/update-many-colors`, updatedColors)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedColors.length + " rekordów.");
            }
        }

        if (newColors.length) {
            const result = (await axios.post(`/api/excel/color/insert-many-colors`, newColors)).data;
            if (result) {
                alert("Dodano pomyślnie " + newColors.length + " rekordów.");
            }
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
                    <th>Kol_Kod</th>
                    <th>Kol_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Kol_Kod} id={item._id} >{item.Kol_Kod}</td>
                        <td id_from_excel_column={item.Kol_Kod} id={item._id}>{item.Kol_Opis}</td>
                        <td id_from_excel_column={item.Kol_Kod} id={item._id}>
                            <Button id_from_excel_column={item.Kol_Kod} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Kolory
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
                            <div className={styles.buttonGroup}>
                                <Button disabled={loading} color="success" size="sm" className={`${styles.button} ${styles.UploadButton}`} onClick={uploadData}>
                                    {"Wczytaj dane z pliku"}
                                </Button>
                                <Button disabled={loading} color="danger" size="sm" className={`${styles.button} ${styles.RemoveFiles}`} onClick={removeFile}>
                                    {"Usuń dane z bazy danych"}
                                </Button>
                                <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                            </div>
                        </Col>
                    </Row>
                    {loading && <progress className={styles.progress}></progress>}
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Kol_Opis</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentColor.Kol_Opis}
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

export default Colors;