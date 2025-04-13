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
import styles from './Stock.module.css';

const requiredFields = ["Tow_Kod", "Tow_Opis"];

const Stock = () => {

    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentStock, setCurrentStock] = useState({ _id: '', Tow_Opis: '' });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const matchFullNames = async () => {
            try {
                const goodsResponse = await axios.get('/api/excel/goods/get-all-goods');
                const stateResponse = await axios.get('/api/state');

                if (goodsResponse.data && stateResponse.data) {
                    const goodsFullNames = goodsResponse.data.goods.map((item) => ({
                        fullName: item.fullName.trim().toLowerCase(), // Normalize fullName
                        plec: item.Plec || "Brak danych", // Include Plec if available
                    }));

                    const matchingValues = stateResponse.data.filter((stateItem) =>
                        goodsFullNames.some((goodsItem) => goodsItem.fullName === stateItem.fullName.trim().toLowerCase())
                    );

                    if (matchingValues.length > 0) {
                        // const alertMessages = matchingValues.map((match) => {
                        //     const matchedGoods = goodsFullNames.find((goodsItem) => goodsItem.fullName === match.fullName.trim().toLowerCase());
                        //     return `Matching Value: ${match.fullName}, Data-Plec: ${matchedGoods.plec}`;
                        // });

                        // alert(alertMessages.join('\n')); // Display all matches in an alert
                    } else {
                        // console.log('No matching values found.');
                    }
                } else {
                    console.error('Unexpected API response format.');
                }
            } catch (error) {
                console.error('Error matching full names:', error);
            }
        };

        matchFullNames();
    }, []); // Run once on component mount

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (stock) => {
        setCurrentStock(stock);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentStock({ ...currentStock, Tow_Opis: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Tow_Opis value is unique
            const response = await axios.get(`/api/excel/stock/get-all-stocks`);
            const stocks = response.data.stocks;
            const duplicate = stocks.find(stock => stock.Tow_Opis === currentStock.Tow_Opis && stock._id !== currentStock._id);

            if (duplicate && currentStock.Tow_Opis !== "") {
                alert(`Wartość Tow_Opis "${currentStock.Tow_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/stock/update-stock/${currentStock._id}`, { Tow_Opis: currentStock.Tow_Opis });
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
                alert("Nie można usunąć asortymentu ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete(`/api/excel/stock/delete-all-stocks`);
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
            const result = (await axios.get(`/api/excel/stock/get-all-stocks`)).data;
            setRows(Array.isArray(result.stocks) ? result.stocks : []);
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

            const stockList = await getStockList();
            if (stockList.length > 0) {
                alert("Tabela asortymentu nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateStocks(stockList);

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
                    const sheetName = workbook.SheetNames[0];
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

    const getStockList = async () => {
        const stockResponse = (await axios.get(`/api/excel/stock/get-all-stocks`)).data;
        return Array.isArray(stockResponse.stocks) ? stockResponse.stocks : [];
    };

    const insertOrUpdateStocks = async (stockList) => {
        const stocks = excelRows.map((obj) => ({
            _id: stockList.find((x) => x.Tow_Kod === obj["Tow_Kod"])?._id,
            Tow_Kod: obj["Tow_Kod"] || "",
            Tow_Opis: obj["Tow_Opis"] || "",
            number_id: Number(obj["Tow_Kod"]) || 0
        }));

        const updatedStocks = stocks.filter((x) => x._id);
        const newStocks = stocks.filter((x) => !x._id);

        if (updatedStocks.length) {
            const result = (await axios.post(`/api/excel/stock/update-many-stocks`, updatedStocks)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedStocks.length + " rekordów.");
            }
        }

        if (newStocks.length) {
            const result = (await axios.post(`/api/excel/stock/insert-many-stocks`, newStocks)).data;
            if (result) {
                alert("Dodano pomyślnie " + newStocks.length + " rekordów.");
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
                    <th>Tow_Kod</th>
                    <th>Tow_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Tow_Kod} id={item._id} >{item.Tow_Kod}</td>
                        <td id_from_excel_column={item.Tow_Kod} id={item._id}>{item.Tow_Opis}</td>
                        <td id_from_excel_column={item.Tow_Kod} id={item._id}>
                            <Button id_from_excel_column={item.Tow_Kod} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Asortyment
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
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Tow_Opis</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentStock.Tow_Opis}
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

export default Stock;