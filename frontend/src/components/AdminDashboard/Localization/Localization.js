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
import styles from './Localization.module.css';

const requiredFields = ["Miejsc_1_Kod_1"]; // Tylko kod jest wymagany, opis może być pusty

const Localization = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentLocalization, setCurrentLocalization] = useState({ _id: '', Miejsc_1_Opis_1: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (localization) => {
        setCurrentLocalization(localization);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentLocalization({ ...currentLocalization, Miejsc_1_Opis_1: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Miejsc_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/localization/get-all-localizations`);
            const localizations = response.data.localizations;
            const duplicate = localizations.find(localization => localization.Miejsc_1_Opis_1 === currentLocalization.Miejsc_1_Opis_1 && localization._id !== currentLocalization._id);

            if (duplicate && currentLocalization.Miejsc_1_Opis_1 !== "") {
                alert(`Wartość Miejsc_1_Opis_1 "${currentLocalization.Miejsc_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            const updateResponse = await axios.patch(`/api/excel/localization/update-localization/${currentLocalization._id}`, { Miejsc_1_Opis_1: currentLocalization.Miejsc_1_Opis_1 });

            fetchData();
            toggleModal();
        } catch (error) {
            // console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = async () => {
        try {
            setLoading(true);

            await axios.delete(`/api/excel/localization/delete-all-localizations`);
            resetState();
            alert("Dane zostały usunięte poprawnie.");
        } catch (error) {
            // console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/localization/get-all-localizations`)).data;
            
            const localizations = Array.isArray(result.localizations) ? result.localizations : [];
            
            // Filtruj tylko te, które mają kod lokalizacji (opis może być pusty)
            const validLocalizations = localizations.filter(item => 
                item.Miejsc_1_Kod_1 && 
                item.Miejsc_1_Kod_1.toString().trim() !== ""
            );
            
            setRows(validLocalizations);
        } catch (error) {
            // Możesz włączyć console.log do debugowania błędów
            // console.log("Błąd przy pobieraniu danych:", error);
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
                alert("Wymagana kolumna: " + JSON.stringify(requiredFields) + ". Kolumna Miejsc_1_Opis_1 jest opcjonalna. Proszę również umieścić dane w piątym arkuszu excela.");
                return;
            }

            const localizationList = await getLocalizationList();
            if (localizationList.length > 0) {
                alert("Tabela lokalizacji nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateLocalizations(localizationList);

            fetchData();
        } catch (error) {
            // console.log(error);
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
                    // Use the 5th sheet (index 4) instead of the first one
                    const sheetName = workbook.SheetNames[4]; // 5th sheet
                    if (!sheetName) {
                        alert("Plik nie zawiera piątego arkusza. Proszę sprawdzić plik Excel.");
                        return;
                    }
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

    const getLocalizationList = async () => {
        const localizationResponse = (await axios.get(`/api/excel/localization/get-all-localizations`)).data;
        return Array.isArray(localizationResponse.localizations) ? localizationResponse.localizations : [];
    };

    const insertOrUpdateLocalizations = async (localizationList) => {
        // Filtruj tylko te rekordy, które mają przynajmniej kod lokalizacji
        // Opis może być pusty - będzie można go później edytować
        const validRows = excelRows.filter(obj => 
            obj["Miejsc_1_Kod_1"] && 
            obj["Miejsc_1_Kod_1"].toString().trim() !== ""
        );
        
        const localizations = validRows.map((obj) => ({
            _id: localizationList.find((x) => x.Miejsc_1_Kod_1 === obj["Miejsc_1_Kod_1"])?._id,
            Miejsc_1_Kod_1: obj["Miejsc_1_Kod_1"].toString().trim(),
            Miejsc_1_Opis_1: obj["Miejsc_1_Opis_1"] ? obj["Miejsc_1_Opis_1"].toString().trim() : "", // Pozwól na puste opisy
            number_id: Number(obj["Miejsc_1_Kod_1"]) || 0
        }));

        const updatedLocalizations = localizations.filter((x) => x._id);
        const newLocalizations = localizations.filter((x) => !x._id);

        if (updatedLocalizations.length) {
            const result = (await axios.post(`/api/excel/localization/update-many-localizations`, updatedLocalizations)).data;
            if (result) {
                alert("Zaktualizowano pomyślnie " + updatedLocalizations.length + " rekordów.");
            }
        }

        if (newLocalizations.length) {
            const result = (await axios.post(`/api/excel/localization/insert-many-localizations`, newLocalizations)).data;
            if (result) {
                alert("Dodano pomyślnie " + newLocalizations.length + " nowych rekordów.");
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
            // console.log(error);
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
                    <th>Miejsc_1_Kod_1</th>
                    <th>Miejsc_1_Opis_1</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id} >{item.Miejsc_1_Kod_1}</td>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id}>{item.Miejsc_1_Opis_1}</td>
                        <td id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id}>
                            <Button id_from_excel_column={item.Miejsc_1_Kod_1} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Lokalizacja
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
                                    {"UWAGA: Wymagana kolumna w Excelu: "}
                                    {requiredFields.join(", ")}
                                    {" + opcjonalnie Miejsc_1_Opis_1 (Dane z 5 arkusza)"}
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
                    <div className={styles.textWhite} style={{ margin: '10px 0' }}>
                        Wyświetlanych rekordów: {rows.length}
                    </div>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Miejsc_1_Opis_1</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentLocalization.Miejsc_1_Opis_1}
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

export default Localization;
