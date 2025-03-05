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
import styles from './Sizes.module.css';

const requiredFields = ["Roz_Kod", "Roz_Opis"];

const Sizes = () => {

    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentSize, setCurrentSize] = useState({ _id: '', Roz_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (size) => {
        setCurrentSize(size);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentSize({ ...currentSize, Roz_Opis: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Roz_Opis value is unique
            const response = await axios.get(`http://localhost:3000/api/excel/size/get-all-sizes`);
            const sizes = response.data.sizes;
            const duplicate = sizes.find(size => size.Roz_Opis === currentSize.Roz_Opis && size._id !== currentSize._id);

            if (duplicate && currentSize.Roz_Opis !== "") {
                alert(`Wartość Roz_Opis "${currentSize.Roz_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`http://localhost:3000/api/excel/size/update-size/${currentSize._id}`, { Roz_Opis: currentSize.Roz_Opis });
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
            const goodsResponse = await axios.get("http://localhost:3000/api/excel/goods/get-all-goods");
            if (goodsResponse.data.goods.length > 0) {
                alert("Nie można usunąć rozmiarów ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete("http://localhost:3000/api/excel/size/delete-all-sizes");
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
            const result = (await axios.get("http://localhost:3000/api/excel/size/get-all-sizes")).data;
            setRows(Array.isArray(result.sizes) ? result.sizes : []);
            console.log(result);
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
            const goodsResponse = await axios.get("http://localhost:3000/api/excel/goods/get-all-goods");
            if (goodsResponse.data.goods.length > 0) {
                alert("Na bazie istaniejego asortymentu zostały już stworzone produkty... Proszę usunąć wszystkie produkty i spróbować ponownie");
                setLoading(false);
                return;
            }

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w pierwszym arkuszu excela.");
                return;
            }

            const sizeList = await getSizeList();
            if (sizeList.length > 0) {
                alert("Tabela rozmiarów nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateSizes(sizeList);

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
                    const sheetName = workbook.SheetNames[2]; // Third sheet
                    const worksheet = workbook.Sheets[sheetName];
                    const json = utils.sheet_to_json(worksheet);
                    setExcelRows(json);
                    console.log(json);
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

    const getSizeList = async () => {
        try {
            const url = "http://localhost:3000/api/excel/size/get-all-sizes";
            console.log(`Requesting URL: ${url}`);
            const sizeResponse = (await axios.get(url)).data;
            return Array.isArray(sizeResponse.sizes) ? sizeResponse.sizes : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const insertOrUpdateSizes = async (sizeList) => {
        const sizes = excelRows.map((obj) => ({
            _id: sizeList.find((x) => x.Roz_Kod === obj["Roz_Kod"])?._id,
            Roz_Kod: obj["Roz_Kod"] || "",
            Roz_Opis: obj["Roz_Opis"] || "",
            number_id: Number(obj["Roz_Kod"]) || 0
        }));

        const updatedSizes = sizes.filter((x) => x._id);
        const newSizes = sizes.filter((x) => !x._id);

        if (updatedSizes.length) {
            const result = (await axios.post("http://localhost:3000/api/excel/size/update-many-sizes", updatedSizes)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedSizes.length + " rekordów.");
            }
        }

        if (newSizes.length) {
            const result = (await axios.post("http://localhost:3000/api/excel/size/insert-many-sizes", newSizes)).data;
            if (result) {
                alert("Dodano pomyślnie " + newSizes.length + " rekordów.");
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
                    <th>Roz_Kod</th>
                    <th>Roz_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Roz_Kod} id={item._id} >{item.Roz_Kod}</td>
                        <td id_from_excel_column={item.Roz_Kod} id={item._id}>{item.Roz_Opis}</td>
                        <td id_from_excel_column={item.Roz_Kod} id={item._id}>
                            <Button id_from_excel_column={item.Roz_Kod} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Rozmiary
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
                    {loading && <progress className={styles.progress}></progress>}
                    <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Roz_Opis</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentSize.Roz_Opis}
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

export default Sizes;